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
import { useMemo, useState } from 'react';
import { decodePassphrase } from '../../../lib/client-utils';
import { DebugMode } from '../../../lib/Debug';
import PuffLoader from 'react-spinner'



export default function CustomRoomConnection() {
  const router = useRouter();
  const { room:roomName, token, codec } = router.query;
  const liveKitUrl = process.env.LIVEKIT_URL || 'wss://anglequest-zyu8yj6j.livekit.cloud';
  const [egressId, setEgressId] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recorderLoading, setRecorderLoading] = useState<boolean>(false);



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

  console.log(typeof liveKitUrl)
  console.log(typeof token)

  const initRecording = () => {
    setRecorderLoading(true)

    fetch('https://anglequest.work/api/expert/record-meeting', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        'room_name' :roomName,
        token,
      }),
    })
    .then(res => res.json())
    .then(response => {
      setRecorderLoading(false)
      
      if(response.status === 'success'){
        console.log(response);
        setIsRecording(true)
        setEgressId(response?.egress_id)
      } else {
        setIsRecording(false)
      }
    })
    .catch((err:any) => {
      setRecorderLoading(false)
      console.error('Failed to initialize recording', err);
      setIsRecording(false);
    })
  };

  const stopRecording = () => {
    setRecorderLoading(true)

    fetch('https://anglequest.work/api/expert/stop-recording', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        'egress_id': egressId
      }),
    })
    .then(res => res.json())
    .then(response => {
      setRecorderLoading(false)
      
      if(response.status === 'success'){
        console.log(response);
        setIsRecording(false)
      } else {
        setIsRecording(true)
      }
    })
    .catch((err:any) => {
      setRecorderLoading(false)
      console.error('Failed to stop recording', err);
      setIsRecording(true);
    })
  };

  if (typeof liveKitUrl !== 'string') {
    return <h2>Missing meeting code</h2>;
  }
  if (typeof token !== 'string') {
    return <h2>Missing meeting code</h2>;
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

          {/* Manual Button for Recording Control inside LiveKitRoom */}
          <div style={{ position: 'absolute', zIndex: 999, bottom: '12px', right: '330px' }}>
            <button className='lk-disconnect-button' onClick={() => isRecording ? stopRecording() : initRecording()}>
              {recorderLoading ? '...' :
              isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
          </div>
        </LiveKitRoom>
      )}
    </main>
  );
}
// made changes
