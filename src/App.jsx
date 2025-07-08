import React, { useState } from 'react';
import axios from 'axios';
import MeetingApp from './MeetingApp';

function App() {
  const [meetingData, setMeetingData] = useState(null);
  const [userId, setUserId] = useState('');

  const [existingUserId, setExistingUserId] = useState('');
  const [existingMeetingId, setExistingMeetingId] = useState('');

  const handleCreateMeeting = async () => {
    try {
      const response = await axios.post('http://localhost:8080/api/chime/create', {
        userId,
      });
      console.log('🆕 Meeting created:', response.data);
      setMeetingData(response.data);
    } catch (error) {
      console.error('❌ Error creating meeting:', error);
    }
  };

  const handleJoinAsAttendee = async () => {
    try {
      const response = await axios.post('http://localhost:8080/api/chime/attendee', {
        meetingId: existingMeetingId,
        userId: existingUserId,
      });

      const fullMeetingData = {
        meeting: response.data.meeting,
        attendee: response.data.attendee,
      };

      console.log('✅ Joined as attendee:', fullMeetingData);
      setMeetingData(fullMeetingData);
      setUserId(existingUserId);
    } catch (error) {
      console.error('❌ Error joining as attendee:', error);
    }
  };

  const handleLeaveMeeting = () => {
    // Reset all states to return to landing screen
    setMeetingData(null);
    setUserId('');
    setExistingUserId('');
    setExistingMeetingId('');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto' }}>
      {!meetingData ? (
        <>
          <h2>🟢 Create a New Meeting</h2>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter User ID (Host)"
            style={{ marginRight: '10px' }}
          />
          <button onClick={handleCreateMeeting}>🚀 Create & Join Meeting</button>

          <hr style={{ margin: '20px 0' }} />

          <h2>🔵 Join Existing Meeting</h2>
          <input
            type="text"
            value={existingUserId}
            onChange={(e) => setExistingUserId(e.target.value)}
            placeholder="Enter Your User ID"
            style={{ marginRight: '10px' }}
          />
          <input
            type="text"
            value={existingMeetingId}
            onChange={(e) => setExistingMeetingId(e.target.value)}
            placeholder="Enter Meeting ID"
            style={{ marginRight: '10px', marginTop: '10px' }}
          />
          <button onClick={handleJoinAsAttendee}>👥 Join as Attendee</button>
        </>
      ) : (
        <MeetingApp meetingData={meetingData} userId={userId} onLeave={handleLeaveMeeting} />
      )}
    </div>
  );
}

export default App;
