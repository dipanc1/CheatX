import React, { useState } from 'react';

function ContextUpload({ resume, setResume, jobDesc, setJobDesc }) {
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescFile, setJobDescFile] = useState(null);

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setResumeFile(file);
      const text = await file.text();
      setResume(text);
    }
  };

  const handleJobDescUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setJobDescFile(file);
      const text = await file.text();
      setJobDesc(text);
    }
  };

  return (
    <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(0, 212, 255, 0.05)', borderRadius: '8px' }}>
      <h3 style={{ color: '#00d4ff', marginBottom: '10px', fontSize: '13px', textTransform: 'uppercase' }}>
        📄 Context Files
      </h3>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
        <label style={{
          padding: '8px 12px',
          background: 'rgba(0, 212, 255, 0.1)',
          border: '1px dashed rgba(0, 212, 255, 0.5)',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          color: '#00d4ff',
          transition: 'all 0.3s',
        }}>
          📥 {resume ? '✓ Resume Loaded' : 'Upload Resume'}
          <input type="file" accept=".txt,.pdf" onChange={handleResumeUpload} style={{ display: 'none' }} />
        </label>

        <label style={{
          padding: '8px 12px',
          background: 'rgba(0, 212, 255, 0.1)',
          border: '1px dashed rgba(0, 212, 255, 0.5)',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          color: '#00d4ff',
          transition: 'all 0.3s',
        }}>
          📥 {jobDesc ? '✓ Job Desc Loaded' : 'Upload Job Desc'}
          <input type="file" accept=".txt,.pdf" onChange={handleJobDescUpload} style={{ display: 'none' }} />
        </label>
      </div>

      {(resume || jobDesc) && (
        <div style={{ fontSize: '11px', color: '#888', marginTop: '8px' }}>
          💡 Hints will now be personalized based on your resume & role
        </div>
      )}
    </div>
  );
}

export default ContextUpload;
