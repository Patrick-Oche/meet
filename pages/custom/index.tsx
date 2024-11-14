'use client';
import { formatChatMessageLinks, LiveKitRoom, VideoConference } from '@livekit/components-react';
import {
  ExternalE2EEKeyProvider,
  LogLevel,
  Room,
  RoomConnectOptions,
  RoomOptions,
  VideoCodec,
  VideoPresets,
} from 'livekit-client';
import { useRouter } from 'next/router';
import { useMemo, useCallback, useEffect, useState } from 'react';
import { decodePassphrase } from '../../lib/client-utils';
import { DebugMode } from '../../lib/Debug';

export default function CustomRoomConnection() {
  const router = useRouter();
  const { liveKitUrl, token, codec } = router.query;
  const [isRecording, setIsRecording] = useState(false);

  const e2eePassphrase =
    typeof window !== 'undefined' && decodePassphrase(window.location.hash.substring(1));
  const worker =
    typeof window !== 'undefined' &&
    new Worker(new URL('livekit-client/e2ee-worker', import.meta.url));
  const keyProvider = new ExternalE2EEKeyProvider();

  const e2eeEnabled = !!(e2eePassphrase && worker);

  const roomOptions = useMemo((): RoomOptions => {
    return {
      publishDefaults: {
        videoSimulcastLayers: [VideoPresets.h540, VideoPresets.h216],
        red: !e2eeEnabled,
        videoCodec: codec as VideoCodec | undefined,
      },
      adaptiveStream: { pixelDensity: 'screen' },
      dynacast: true,
      e2ee: e2eeEnabled
        ? {
            keyProvider,
            worker,
          }
        : undefined,
    };
  }, []);

  const room = useMemo(() => new Room(roomOptions), []);

  if (e2eeEnabled) {
    keyProvider.setKey(e2eePassphrase);
    room.setE2EEEnabled(true);
  }

  const connectOptions = useMemo((): RoomConnectOptions => {
    return {
      autoSubscribe: true,
    };
  }, []);

  // Define startRecording and stopRecording functions
  const startRecording = useCallback(async () => {
    if (!isRecording) {
      try {
        // SDK logic for starting the recording
        console.log("Recording started...");
        setIsRecording(true);
      } catch (error) {
        console.error("Error starting recording", error);
      }
    }
  }, [isRecording]);

  const stopAndSaveRecording = useCallback(async () => {
    if (isRecording) {
      try {
        // SDK logic for stopping and saving the recording
        console.log("Recording stopped...");
        setIsRecording(false);
      } catch (error) {
        console.error("Error stopping and saving recording", error);
      }
    }
  }, [isRecording]);

  useEffect(() => {
    // Start recording when the room is connected
    room.on('connected', startRecording);

    // Stop and save recording when the room disconnects
    room.on('disconnected', stopAndSaveRecording);

    return () => {
      room.off('connected', startRecording);
      room.off('disconnected', stopAndSaveRecording);
    };
  }, [room, startRecording, stopAndSaveRecording]);

  // Check for required parameters
  if (typeof liveKitUrl !== 'string') {
    return <h2>Missing LiveKit URL</h2>;
  }
  if (typeof token !== 'string') {
    return <h2>Missing LiveKit token</h2>;
  }

  return (
    <main data-lk-theme="default">
      {liveKitUrl && (
        <LiveKitRoom
          room={room}
          token={token}
          connectOptions={connectOptions}
          serverUrl={liveKitUrl}
          audio={true}
          video={true}
        >
          <VideoConference chatMessageFormatter={formatChatMessageLinks} />
          <DebugMode logLevel={LogLevel.debug} />

          {/* Optional: Recording Button */}
          <div style={{
            position: 'absolute',
            bottom: '10px',
            right: '20px',
            zIndex: 10,
          }}>
            <button onClick={isRecording ? stopAndSaveRecording : startRecording}>
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
          </div>
        </LiveKitRoom>
      )}
    </main>
  );
}
