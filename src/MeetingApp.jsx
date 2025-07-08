import React, { useEffect, useRef, useState } from 'react';
import {
  DefaultDeviceController,
  ConsoleLogger,
  LogLevel,
  MeetingSessionConfiguration,
  DefaultMeetingSession
} from 'amazon-chime-sdk-js';

function MeetingApp({ meetingData, userId, attendeeMap = {}, onLeave }) {
  const observerRef = useRef(null);
  const [meetingSession, setMeetingSession] = useState(null);
  const [joined, setJoined] = useState(false);
  const localStreamRef = useRef(null); // Store local media stream

  useEffect(() => {
    const logger = new ConsoleLogger('ChimeLogs', LogLevel.INFO);
    const deviceController = new DefaultDeviceController(logger);

    const configuration = new MeetingSessionConfiguration(
      {
        MeetingId: meetingData.meeting.meetingId,
        MediaPlacement: meetingData.meeting.mediaPlacement,
        ExternalMeetingId: 'demo-meeting'
      },
      {
        AttendeeId: meetingData.attendee.attendeeId,
        JoinToken: meetingData.attendee.joinToken,
        ExternalUserId: userId
      }
    );

    const session = new DefaultMeetingSession(configuration, logger, deviceController);
    setMeetingSession(session);
    window.meetingSession = session;
  }, [meetingData, userId]);

  const startMeeting = async () => {
    try {
      if (!meetingSession) {
        console.error("❌ Meeting session not ready");
        return;
      }

      const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = localStream; // Store for cleanup later

      const audioInputs = await meetingSession.audioVideo.listAudioInputDevices();
      const videoInputs = await meetingSession.audioVideo.listVideoInputDevices();

      if (audioInputs.length > 0) {
        await meetingSession.audioVideo.startAudioInput(audioInputs[0].deviceId);
        console.log("🎤 Audio input started:", audioInputs[0].label);
      }

      if (videoInputs.length > 0) {
        await meetingSession.audioVideo.startVideoInput(videoInputs[0].deviceId);
        console.log("📷 Video input started:", videoInputs[0].label);
      }

      meetingSession.audioVideo.start();

      const observer = {
        videoTileDidUpdate: (tileState) => {
          if (!tileState.boundAttendeeId && !tileState.isContent) return;

          const existingElement = document.getElementById(`tile-${tileState.tileId}`);
          if (existingElement) return;

          const container = document.getElementById("video-container");

          const wrapper = document.createElement("div");
          wrapper.style.display = "flex";
          wrapper.style.flexDirection = "column";
          wrapper.style.alignItems = "center";
          wrapper.style.margin = "10px";

          const nameLabel = document.createElement("div");
          let labelText = "Screen Share";
          if (!tileState.isContent) {
            const friendlyName = attendeeMap[tileState.boundAttendeeId] || tileState.boundExternalUserId || `User: ${tileState.boundAttendeeId}`;
            labelText = friendlyName;
          }
          nameLabel.innerText = labelText;
          nameLabel.style.marginBottom = "5px";
          nameLabel.style.fontSize = "14px";
          nameLabel.style.color = tileState.localTile ? 'green' : '#333';
          nameLabel.style.fontWeight = "bold";

          const videoElement = document.createElement("video");
          videoElement.id = `tile-${tileState.tileId}`;
          videoElement.autoplay = true;
          videoElement.playsInline = true;
          videoElement.muted = tileState.localTile;
          videoElement.style.width = tileState.isContent ? "600px" : "300px";
          videoElement.style.height = tileState.isContent ? "400px" : "220px";
          videoElement.style.border = "2px solid orange";

          wrapper.appendChild(nameLabel);
          wrapper.appendChild(videoElement);
          container.appendChild(wrapper);

          meetingSession.audioVideo.bindVideoElement(tileState.tileId, videoElement);
          console.log(`✅ Bound ${tileState.isContent ? "screen share" : "user video"} to tileId:`, tileState.tileId);
        },

        videoTileWasRemoved: (tileId) => {
          const elem = document.getElementById(`tile-${tileId}`);
          if (elem && elem.parentNode) elem.parentNode.remove();
        },

        contentShareDidStart: () => {
          console.log("✅ Content share started");
        },
        contentShareDidStop: () => {
          console.log("🛑 Content share stopped");
        }
      };

      observerRef.current = observer;
      meetingSession.audioVideo.addObserver(observer);
      meetingSession.audioVideo.startLocalVideoTile();

      setJoined(true);
      console.log("✅ Joined meeting");
    } catch (err) {
      console.error("❌ Failed to join meeting:", err);
    }
  };

  const endMeeting = async () => {
    if (meetingSession) {
      if (observerRef.current) {
        meetingSession.audioVideo.removeObserver(observerRef.current);
        console.log("🧹 Observer removed");
      }

      meetingSession.audioVideo.stop();
      await meetingSession.audioVideo.stopLocalVideoTile();
      await meetingSession.audioVideo.stopVideoInput();
      await meetingSession.audioVideo.stopAudioInput();

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
        console.log("🎬 Camera & mic fully stopped");
      }

      try {
        await fetch("http://localhost:8080/api/chime/attendee/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            meetingId: meetingData.meeting.meetingId,
            attendeeId: meetingData.attendee.attendeeId
          })
        });
        console.log("✅ Attendee removed from backend");
      } catch (err) {
        console.warn("⚠️ Could not delete attendee from backend:", err);
      }

      const container = document.getElementById("video-container");
      if (container) container.innerHTML = "";

      setJoined(false);
      console.log("🚪 Left meeting and camera/mic closed immediately");

      if (onLeave) onLeave();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(meetingData.meeting.meetingId);
    alert("Meeting ID copied to clipboard!");
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <h2><b>Amazon Chime Meeting</b></h2>

      <div
        id="video-container"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          padding: '10px',
          minHeight: '250px',
          border: '1px solid lightgray'
        }}
      />

      {joined && (
        <div style={{ marginTop: '10px', fontSize: '14px', color: 'green' }}>
          ✅ <b>Meeting ID:</b> {meetingData.meeting.meetingId} {' '}
          <button onClick={copyToClipboard} style={{ fontSize: '12px', padding: '2px 6px', marginLeft: '10px' }}>📋 Copy</button>
        </div>
      )}

      {joined ? (
        <p style={{ marginTop: '10px' }}>
          You are in the meeting as User Id: <b>{attendeeMap[meetingData.attendee.attendeeId] || userId}</b>
        </p>
      ) : (
        <p style={{ marginTop: '10px' }}>Click "Join Meeting" to start</p>
      )}

      {!joined ? (
        <button
          onClick={startMeeting}
          style={{ padding: '10px 20px', fontSize: '16px', marginTop: '10px' }}
        >
          🎥 Join Meeting
        </button>
      ) : (
        <button
          onClick={endMeeting}
          style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: 'red', color: 'white', marginTop: '10px' }}
        >
          ❌ End Meeting
        </button>
      )}

      {joined && (
        <div style={{ marginTop: '15px' }}>
          <button
            onClick={async () => {
              try {
                await meetingSession.audioVideo.startContentShareFromScreenCapture();
                console.log("🖥️ Screen sharing started");
              } catch (err) {
                console.error("❌ Failed to start screen share:", err);
              }
            }}
            style={{ padding: '8px 16px', fontSize: '14px', marginRight: '10px' }}
          >
            📡 Start Screen Share
          </button>

          <button
            onClick={() => {
              meetingSession.audioVideo.stopContentShare();
              console.log("🛑 Screen sharing stopped");
            }}
            style={{ padding: '8px 16px', fontSize: '14px', backgroundColor: '#888', color: 'white' }}
          >
            🛑 Stop Screen Share
          </button>
        </div>
      )}
    </div>
  );
}

export default MeetingApp;
