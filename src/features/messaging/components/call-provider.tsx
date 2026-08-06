"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Maximize2, Mic, Minimize2, MicOff, Phone, PhoneOff, Video, VideoOff } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { initials } from "@/features/messaging/lib/initials"
import type { CallSignal, RealtimeEvent } from "@/features/messaging/lib/realtime"
import type { ParticipantRef } from "@/features/messaging/lib/types"

/**
 * Mesh WebRTC calling. Protocol (deliberately asymmetric to avoid offer/
 * answer glare without needing a tie-break rule): whoever is ALREADY in the
 * call always initiates the offer to a participant who just joined. A
 * joiner never initiates — they only ever answer incoming offers. This
 * still produces a full mesh: when a 3rd person joins, both pre-existing
 * members independently offer to them on hearing the same "accept"
 * broadcast, with zero coordination between the two of them needed.
 */

type CallStatus = "idle" | "outgoing" | "incoming" | "in-call"

type IncomingInvite = { callId: string; conversationId: string; fromUserId: string; withVideo: boolean }

type CallState = {
  status: CallStatus
  callId: string | null
  conversationId: string | null
  withVideo: boolean
  incoming: IncomingInvite | null
  participants: Map<string, ParticipantRef>
  connectedUserIds: string[]
  micOn: boolean
  cameraOn: boolean
}

const IDLE_STATE: CallState = {
  status: "idle",
  callId: null,
  conversationId: null,
  withVideo: false,
  incoming: null,
  participants: new Map(),
  connectedUserIds: [],
  micOn: true,
  cameraOn: true,
}

type CallContextValue = {
  state: CallState
  startCall: (conversationId: string, participants: ParticipantRef[], withVideo: boolean) => void
  acceptCall: () => void
  declineCall: () => void
  endCall: () => void
  toggleMic: () => void
  toggleCamera: () => void
}

const CallContext = createContext<CallContextValue | null>(null)

export function useCall() {
  const ctx = useContext(CallContext)
  if (!ctx) throw new Error("useCall must be used within CallProvider")
  return ctx
}

/** Maps getUserMedia's DOMException names to a message that actually says
 * what's wrong, instead of a generic "check permissions" that's equally
 * true (and equally useless) whether the real cause is a denied
 * permission, no camera on the device, or the camera being held by
 * another app. */
function describeMediaError(error: unknown): string {
  const name = error instanceof DOMException ? error.name : null
  switch (name) {
    case "NotAllowedError":
      return "Camera/microphone access was denied. Allow it for this site, then try again."
    case "NotFoundError":
      return "No camera or microphone was found on this device."
    case "NotReadableError":
      return "Your camera or microphone is already in use by another app or browser tab."
    case "OverconstrainedError":
      return "This device doesn't support the requested camera/microphone settings."
    case "SecurityError":
      return "Camera/microphone access is blocked on this page (insecure context or permissions policy)."
    default: {
      const detail = error instanceof Error ? error.message : String(error)
      return `Couldn't access your microphone/camera${name ? ` (${name})` : ""}: ${detail}`
    }
  }
}

/** Turns a silent hang into a visible error after `ms` — a rejected/thrown
 * promise surfaces via the toast in handleSignal's catch block; a promise
 * that just never resolves (e.g. a stuck fetch) previously didn't. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timed out waiting for ${label}`)), ms)),
  ])
}

async function getIceServers(): Promise<RTCIceServer[]> {
  const result = await apiFetch<{ iceServers: RTCIceServer[] }>("/api/messages/turn-credentials")
  if (!result.success) throw new Error(result.error.message)
  return result.data.iceServers
}

// A fresh AudioContext created at the moment an invite arrives starts
// "suspended" on most mobile browsers — audio only plays once the context
// has been resumed inside a real user gesture, and an incoming call is a
// network event, not a tap. Instead, prime ONE shared context on the
// very first tap/keypress anywhere in the app (session-wide, well before
// any call), so it's already running by the time a ringtone needs it.
let sharedAudioContext: AudioContext | null = null

function getSharedAudioContext(): AudioContext {
  if (!sharedAudioContext) sharedAudioContext = new AudioContext()
  return sharedAudioContext
}

function primeAudioOnFirstInteraction() {
  const unlock = () => {
    const ctx = getSharedAudioContext()
    if (ctx.state === "suspended") ctx.resume().catch(() => {})
    window.removeEventListener("pointerdown", unlock)
    window.removeEventListener("keydown", unlock)
  }
  window.addEventListener("pointerdown", unlock, { once: true })
  window.addEventListener("keydown", unlock, { once: true })
  return () => {
    window.removeEventListener("pointerdown", unlock)
    window.removeEventListener("keydown", unlock)
  }
}

/** One short two-tone "brring" pulse, synthesized (no audio asset needed). */
function playRingtoneTick(ctx: AudioContext) {
  const now = ctx.currentTime
  ;[0, 0.16].forEach((offset) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "sine"
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0, now + offset)
    gain.gain.linearRampToValueAtTime(0.2, now + offset + 0.02)
    gain.gain.linearRampToValueAtTime(0, now + offset + 0.14)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now + offset)
    osc.stop(now + offset + 0.15)
  })
}

function VideoTile({
  stream,
  label,
  muted,
  showVideo,
  size = "sm",
}: {
  stream: MediaStream | null
  label: string
  muted: boolean
  showVideo: boolean
  size?: "sm" | "lg"
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = videoRef.current
    if (!el || !stream) return
    el.srcObject = stream
    // The `autoPlay` attribute alone doesn't surface a blocked-by-browser
    // failure anywhere — a rejected play() promise just leaves the element
    // silently paused (remote audio never audible, easy to miss since the
    // last video frame can still look "live" in a screenshot).
    el.play().catch((error) => {
      console.warn(`[call] playback blocked for "${label}" (autoplay policy?):`, error)
    })
  }, [stream, label])

  return (
    <div
      className={cn(
        "relative flex aspect-video items-center justify-center overflow-hidden rounded-md bg-neutral-900",
        size === "sm" ? "w-40" : "w-full max-w-md"
      )}
    >
      {showVideo && stream ? (
        <video ref={videoRef} autoPlay playsInline muted={muted} className="h-full w-full object-cover" />
      ) : (
        <Avatar className={size === "sm" ? "size-10" : "size-16"}>
          <AvatarFallback className="bg-neutral-700 text-neutral-200">{initials(label)}</AvatarFallback>
        </Avatar>
      )}
      <span className="absolute bottom-1 left-1.5 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">{label}</span>
    </div>
  )
}

export function CallProvider({
  currentUserId,
  currentUserName,
  children,
}: {
  currentUserId: string
  currentUserName: string
  children: React.ReactNode
}) {
  const [state, setState] = useState<CallState>(IDLE_STATE)
  const stateRef = useRef(state)
  stateRef.current = state

  const localStreamRef = useRef<MediaStream | null>(null)
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map())
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
  const [isExpanded, setIsExpanded] = useState(false)

  // Primes the shared ringtone AudioContext on the first tap/keypress
  // anywhere in the app, well before any call could arrive.
  useEffect(() => primeAudioOnFirstInteraction(), [])

  // Rings while an invite is waiting on this end. Reuses the shared,
  // already-unlocked AudioContext instead of creating (and needing to
  // unlock) a fresh one at the moment the invite arrives.
  useEffect(() => {
    if (state.status !== "incoming") return
    let ctx: AudioContext | null = null
    try {
      ctx = getSharedAudioContext()
      if (ctx.state === "suspended") ctx.resume().catch(() => {})
      playRingtoneTick(ctx)
    } catch (error) {
      console.warn("[call] couldn't start ringtone:", error)
    }
    const interval = setInterval(() => {
      if (ctx) playRingtoneTick(ctx)
    }, 1500)
    return () => clearInterval(interval)
  }, [state.status])

  function sendSignal(conversationId: string, signal: CallSignal) {
    apiFetch(`/api/messages/conversations/${conversationId}/call-signal`, { method: "POST", body: signal }).catch(() => {
      toast.error("Call connection issue — the other side may not have received that.")
    })
  }

  const resetCall = useCallback(() => {
    peersRef.current.forEach((pc) => pc.close())
    peersRef.current.clear()
    pendingCandidatesRef.current.clear()
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    localStreamRef.current = null
    setLocalStream(null)
    setRemoteStreams(new Map())
    setState(IDLE_STATE)
    setIsExpanded(false)
  }, [])

  const createPeerConnection = useCallback(
    (remoteUserId: string, conversationId: string, callId: string, iceServers: RTCIceServer[]) => {
      const pc = new RTCPeerConnection({ iceServers })
      peersRef.current.set(remoteUserId, pc)

      localStreamRef.current?.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!)
      })

      pc.ontrack = (event) => {
        console.log(`[call] received remote track (${event.track.kind}) from ${remoteUserId}`)
        setRemoteStreams((prev) => {
          const next = new Map(prev)
          next.set(remoteUserId, event.streams[0] ?? new MediaStream([event.track]))
          return next
        })
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal(conversationId, {
            kind: "ice-candidate",
            callId,
            toUserId: remoteUserId,
            candidate: event.candidate.toJSON(),
          })
        }
      }

      // The most useful signal for "signaling finished but no audio/video":
      // connectionState only reaches "connected" once ICE has actually
      // found a working path (direct or via TURN relay). Stuck on
      // "checking" or landing on "failed" means the offer/answer exchange
      // worked but connectivity itself didn't — a TURN/network issue, not
      // a signaling bug.
      pc.oniceconnectionstatechange = () => {
        console.log(`[call] ICE connection state with ${remoteUserId}: ${pc.iceConnectionState}`)
      }

      pc.onicecandidateerror = (event) => {
        const e = event as RTCPeerConnectionIceErrorEvent
        console.warn(`[call] ICE candidate error with ${remoteUserId}: ${e.errorCode} ${e.errorText} (${e.url ?? "no url"})`)
      }

      pc.onconnectionstatechange = () => {
        console.log(`[call] connection state with ${remoteUserId}: ${pc.connectionState}`)
        if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          peersRef.current.delete(remoteUserId)
          setRemoteStreams((prev) => {
            const next = new Map(prev)
            next.delete(remoteUserId)
            return next
          })
        }
      }

      return pc
    },
    []
  )

  const startCall = useCallback(
    async (conversationId: string, participants: ParticipantRef[], withVideo: boolean) => {
      if (stateRef.current.status !== "idle") {
        toast.error("You're already on a call")
        return
      }
      const callId = `${currentUserId}-${Date.now()}`
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: withVideo })
        localStreamRef.current = stream
        setLocalStream(stream)
      } catch (error) {
        toast.error(describeMediaError(error))
        return
      }

      setState({
        ...IDLE_STATE,
        status: "outgoing",
        callId,
        conversationId,
        withVideo,
        participants: new Map(participants.map((p) => [p.id, p])),
        connectedUserIds: [currentUserId],
      })
      sendSignal(conversationId, { kind: "invite", callId, withVideo })
    },
    [currentUserId]
  )

  const acceptCall = useCallback(async () => {
    const invite = stateRef.current.incoming
    if (!invite) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: invite.withVideo })
      localStreamRef.current = stream
      setLocalStream(stream)
    } catch (error) {
      toast.error(describeMediaError(error))
      sendSignal(invite.conversationId, { kind: "decline", callId: invite.callId })
      setState(IDLE_STATE)
      return
    }

    setState((prev) => ({
      ...prev,
      status: "in-call",
      callId: invite.callId,
      conversationId: invite.conversationId,
      withVideo: invite.withVideo,
      incoming: null,
      connectedUserIds: [currentUserId],
    }))
    sendSignal(invite.conversationId, { kind: "accept", callId: invite.callId })
  }, [currentUserId])

  const declineCall = useCallback(() => {
    const invite = stateRef.current.incoming
    if (!invite) return
    sendSignal(invite.conversationId, { kind: "decline", callId: invite.callId })
    setState(IDLE_STATE)
  }, [])

  const endCall = useCallback(() => {
    const { conversationId, callId } = stateRef.current
    if (conversationId && callId) {
      sendSignal(conversationId, { kind: "end", callId })
    }
    resetCall()
  }, [resetCall])

  const toggleMic = useCallback(() => {
    const next = !stateRef.current.micOn
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = next))
    setState((prev) => ({ ...prev, micOn: next }))
  }, [])

  const toggleCamera = useCallback(() => {
    const next = !stateRef.current.cameraOn
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = next))
    setState((prev) => ({ ...prev, cameraOn: next }))
  }, [])

  // Handles a signal addressed to an active call for THIS user.
  const handleSignal = useCallback(
    async (fromUserId: string, signal: CallSignal, conversationId: string) => {
      const current = stateRef.current

      try {
        if (signal.kind === "invite") {
          if (current.status !== "idle") {
            sendSignal(conversationId, { kind: "decline", callId: signal.callId })
            return
          }
          setState((prev) => ({
            ...prev,
            status: "incoming",
            incoming: { callId: signal.callId, conversationId, fromUserId, withVideo: signal.withVideo },
          }))
          return
        }

        if (signal.callId !== current.callId) return // stale/unrelated call

        if (signal.kind === "decline") {
          toast.info("Call declined")
          if (current.connectedUserIds.length <= 1) resetCall()
          return
        }

        if (signal.kind === "end") {
          peersRef.current.get(fromUserId)?.close()
          peersRef.current.delete(fromUserId)
          setRemoteStreams((prev) => {
            const next = new Map(prev)
            next.delete(fromUserId)
            return next
          })
          setState((prev) => ({ ...prev, connectedUserIds: prev.connectedUserIds.filter((id) => id !== fromUserId) }))
          // 1:1 call: the other side leaving ends it for us too.
          if (current.participants.size <= 1) resetCall()
          return
        }

        if (signal.kind === "accept") {
          console.log(`[call] ${fromUserId} accepted — creating offer`)
          const iceServers = await withTimeout(getIceServers(), 8000, "ICE servers")
          console.log(`[call] got ${iceServers.length} ICE server(s)`)
          const pc = createPeerConnection(fromUserId, conversationId, current.callId!, iceServers)
          setState((prev) => ({ ...prev, status: "in-call", connectedUserIds: [...prev.connectedUserIds, fromUserId] }))
          const offer = await withTimeout(pc.createOffer(), 8000, "createOffer")
          console.log(`[call] offer created`)
          await withTimeout(pc.setLocalDescription(offer), 8000, "setLocalDescription(offer)")
          console.log(`[call] local description set — sending offer to ${fromUserId}`)
          sendSignal(conversationId, { kind: "offer", callId: current.callId!, toUserId: fromUserId, sdp: offer })
          return
        }

        if (signal.kind === "offer") {
          console.log(`[call] received offer from ${fromUserId} — answering`)
          const iceServers = await withTimeout(getIceServers(), 8000, "ICE servers")
          console.log(`[call] got ${iceServers.length} ICE server(s)`)
          const pc = createPeerConnection(fromUserId, conversationId, current.callId!, iceServers)
          await withTimeout(
            pc.setRemoteDescription(new RTCSessionDescription(signal.sdp as RTCSessionDescriptionInit)),
            8000,
            "setRemoteDescription(offer)"
          )
          console.log(`[call] remote description (offer) set`)
          for (const c of pendingCandidatesRef.current.get(fromUserId) ?? []) {
            await pc.addIceCandidate(new RTCIceCandidate(c))
          }
          pendingCandidatesRef.current.delete(fromUserId)
          const answer = await withTimeout(pc.createAnswer(), 8000, "createAnswer")
          console.log(`[call] answer created`)
          await withTimeout(pc.setLocalDescription(answer), 8000, "setLocalDescription(answer)")
          console.log(`[call] local description set — updating state and sending answer to ${fromUserId}`)
          setState((prev) => ({
            ...prev,
            status: "in-call",
            connectedUserIds: prev.connectedUserIds.includes(fromUserId)
              ? prev.connectedUserIds
              : [...prev.connectedUserIds, fromUserId],
          }))
          sendSignal(conversationId, { kind: "answer", callId: current.callId!, toUserId: fromUserId, sdp: answer })
          console.log(`[call] answer sent to ${fromUserId}`)
          return
        }

        if (signal.kind === "answer") {
          console.log(`[call] received answer from ${fromUserId}`)
          const pc = peersRef.current.get(fromUserId)
          if (pc) {
            await withTimeout(
              pc.setRemoteDescription(new RTCSessionDescription(signal.sdp as RTCSessionDescriptionInit)),
              8000,
              "setRemoteDescription(answer)"
            )
            console.log(`[call] remote description (answer) set for ${fromUserId} — connection should complete shortly`)
          } else {
            console.warn(`[call] received answer from ${fromUserId} but no matching peer connection exists`)
          }
          return
        }

        if (signal.kind === "ice-candidate") {
          const pc = peersRef.current.get(fromUserId)
          const candidate = signal.candidate as RTCIceCandidateInit
          if (pc?.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate))
          } else {
            const list = pendingCandidatesRef.current.get(fromUserId) ?? []
            list.push(candidate)
            pendingCandidatesRef.current.set(fromUserId, list)
          }
        }
      } catch (error) {
        // Every step above (fetching ICE servers, createOffer/
        // createAnswer, setRemoteDescription...) used to let a thrown/
        // rejected promise die silently — the UI just stayed stuck on
        // "Calling…" forever with no visible cause. Surface it instead.
        console.error(`[call] failed handling "${signal.kind}" signal from ${fromUserId}:`, error)
        toast.error(
          `Call connection failed (${signal.kind}): ${error instanceof Error ? error.message : String(error)}`
        )
      }
    },
    [createPeerConnection, resetCall]
  )

  useEffect(() => {
    const source = new EventSource("/api/messages/stream")
    source.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as RealtimeEvent
        if (parsed.type !== "call-signal") return
        handleSignal(parsed.fromUserId, parsed.signal, parsed.conversationId)
      } catch {
        // ignore malformed events
      }
    }
    return () => source.close()
  }, [handleSignal])

  const remoteParticipants = state.connectedUserIds
    .filter((id) => id !== currentUserId)
    .map((id) => state.participants.get(id))
    .filter((p): p is ParticipantRef => !!p)

  return (
    <CallContext.Provider value={{ state, startCall, acceptCall, declineCall, endCall, toggleMic, toggleCamera }}>
      {children}
      {state.status === "incoming" && state.incoming && (
        <div className="fixed top-4 right-4 z-50 w-72 rounded-lg border bg-card p-4 shadow-lg">
          <p className="text-sm font-medium">Incoming {state.incoming.withVideo ? "video" : "voice"} call</p>
          <p className="mb-3 text-xs text-muted-foreground">
            {state.participants.get(state.incoming.fromUserId)?.name ?? "Someone"} is calling
          </p>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={acceptCall}>
              <Phone /> Accept
            </Button>
            <Button size="sm" variant="destructive" className="flex-1" onClick={declineCall}>
              <PhoneOff /> Decline
            </Button>
          </div>
        </div>
      )}

      {(state.status === "outgoing" || state.status === "in-call") && (
        <div
          className={cn(
            "fixed z-50 flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-lg",
            isExpanded ? "inset-4 items-center justify-center md:inset-16" : "right-4 bottom-4"
          )}
        >
          <div className="flex w-full items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {state.status === "outgoing" ? "Calling…" : `On call · ${remoteParticipants.length + 1} people`}
            </p>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => setIsExpanded((v) => !v)}
              title={isExpanded ? "Minimize" : "Expand"}
            >
              {isExpanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            </Button>
          </div>
          <div className={cn("flex flex-wrap justify-center gap-2", isExpanded && "flex-1 items-center")}>
            <VideoTile
              stream={localStream}
              label={`${currentUserName} (you)`}
              muted
              showVideo={state.withVideo && state.cameraOn}
              size={isExpanded ? "lg" : "sm"}
            />
            {remoteParticipants.map((p) => (
              <VideoTile
                key={p.id}
                stream={remoteStreams.get(p.id) ?? null}
                label={p.name}
                muted={false}
                showVideo={state.withVideo}
                size={isExpanded ? "lg" : "sm"}
              />
            ))}
          </div>
          <div className="flex justify-center gap-2">
            <Button size="icon" variant="outline" onClick={toggleMic} title={state.micOn ? "Mute" : "Unmute"}>
              {state.micOn ? <Mic /> : <MicOff />}
            </Button>
            {state.withVideo && (
              <Button size="icon" variant="outline" onClick={toggleCamera} title={state.cameraOn ? "Camera off" : "Camera on"}>
                {state.cameraOn ? <Video /> : <VideoOff />}
              </Button>
            )}
            <Button size="icon" variant="destructive" onClick={endCall} title="Hang up">
              <PhoneOff />
            </Button>
          </div>
        </div>
      )}
    </CallContext.Provider>
  )
}
