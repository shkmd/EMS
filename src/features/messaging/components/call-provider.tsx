"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api-client"
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

async function getIceServers(): Promise<RTCIceServer[]> {
  const result = await apiFetch<{ iceServers: RTCIceServer[] }>("/api/messages/turn-credentials")
  if (!result.success) throw new Error(result.error.message)
  return result.data.iceServers
}

function VideoTile({
  stream,
  label,
  muted,
  showVideo,
}: {
  stream: MediaStream | null
  label: string
  muted: boolean
  showVideo: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream
  }, [stream])

  return (
    <div className="relative flex aspect-video w-40 items-center justify-center overflow-hidden rounded-md bg-neutral-900">
      {showVideo && stream ? (
        <video ref={videoRef} autoPlay playsInline muted={muted} className="h-full w-full object-cover" />
      ) : (
        <Avatar className="size-10">
          <AvatarFallback className="bg-neutral-700 text-neutral-200">{initials(label)}</AvatarFallback>
        </Avatar>
      )}
      <span className="absolute bottom-1 left-1.5 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">{label}</span>
    </div>
  )
}

export function CallProvider({ currentUserId, currentUserName }: { currentUserId: string; currentUserName: string }) {
  const [state, setState] = useState<CallState>(IDLE_STATE)
  const stateRef = useRef(state)
  stateRef.current = state

  const localStreamRef = useRef<MediaStream | null>(null)
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map())
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())

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
  }, [])

  const createPeerConnection = useCallback(
    (remoteUserId: string, conversationId: string, callId: string, iceServers: RTCIceServer[]) => {
      const pc = new RTCPeerConnection({ iceServers })
      peersRef.current.set(remoteUserId, pc)

      localStreamRef.current?.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!)
      })

      pc.ontrack = (event) => {
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

      pc.onconnectionstatechange = () => {
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
      } catch {
        toast.error("Couldn't access your microphone/camera. Check browser permissions.")
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
    } catch {
      toast.error("Couldn't access your microphone/camera. Check browser permissions.")
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
        const iceServers = await getIceServers()
        const pc = createPeerConnection(fromUserId, conversationId, current.callId!, iceServers)
        setState((prev) => ({ ...prev, status: "in-call", connectedUserIds: [...prev.connectedUserIds, fromUserId] }))
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        sendSignal(conversationId, { kind: "offer", callId: current.callId!, toUserId: fromUserId, sdp: offer })
        return
      }

      if (signal.kind === "offer") {
        const iceServers = await getIceServers()
        const pc = createPeerConnection(fromUserId, conversationId, current.callId!, iceServers)
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp as RTCSessionDescriptionInit))
        for (const c of pendingCandidatesRef.current.get(fromUserId) ?? []) {
          await pc.addIceCandidate(new RTCIceCandidate(c))
        }
        pendingCandidatesRef.current.delete(fromUserId)
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        setState((prev) => ({
          ...prev,
          status: "in-call",
          connectedUserIds: prev.connectedUserIds.includes(fromUserId)
            ? prev.connectedUserIds
            : [...prev.connectedUserIds, fromUserId],
        }))
        sendSignal(conversationId, { kind: "answer", callId: current.callId!, toUserId: fromUserId, sdp: answer })
        return
      }

      if (signal.kind === "answer") {
        const pc = peersRef.current.get(fromUserId)
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp as RTCSessionDescriptionInit))
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
        <div className="fixed right-4 bottom-4 z-50 flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-lg">
          <p className="text-xs text-muted-foreground">
            {state.status === "outgoing" ? "Calling…" : `On call · ${remoteParticipants.length + 1} people`}
          </p>
          <div className="flex flex-wrap gap-2">
            <VideoTile stream={localStream} label={`${currentUserName} (you)`} muted showVideo={state.withVideo && state.cameraOn} />
            {remoteParticipants.map((p) => (
              <VideoTile
                key={p.id}
                stream={remoteStreams.get(p.id) ?? null}
                label={p.name}
                muted={false}
                showVideo={state.withVideo}
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
