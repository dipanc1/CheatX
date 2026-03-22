import React, { useState } from 'react';

function ContextUpload({ resume, setResume, jobDesc, setJobDesc }) {
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescFile, setJobDescFile] = useState(null);
  const [showResumeInput, setShowResumeInput] = useState(false);
  const [showJobDescInput, setShowJobDescInput] = useState(false);

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setResumeFile(file);
      const text = await file.text();
      setResume(text);
      setShowResumeInput(false);
    }
  };

  const handleJobDescUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setJobDescFile(file);
      const text = await file.text();
      setJobDesc(text);
      setShowJobDescInput(false);
    }
  };

  return (
    <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(0, 212, 255, 0.05)', borderRadius: '8px' }}>
      <h3 style={{ color: '#00d4ff', marginBottom: '10px', fontSize: '13px', textTransform: 'uppercase' }}>
        📄 Context Files
      </h3>

      {/* Resume Section */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
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
            <input type="file" accept=".txt" onChange={handleResumeUpload} style={{ display: 'none' }} />
          </label>

          <button
            onClick={() => setShowResumeInput(!showResumeInput)}
            style={{
              padding: '8px 12px',
              background: 'rgba(0, 212, 255, 0.1)',
              border: '1px dashed rgba(0, 212, 255, 0.5)',
              borderRadius: '4px',
              color: '#00d4ff',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
              transition: 'all 0.3s',
            }}
          >
            📝 {resume ? '✓ Edit Resume' : 'Paste Resume'}
          </button>

          {resume && (
            <button
              onClick={() => setResume('')}
              style={{
                padding: '8px 12px',
                background: 'rgba(255, 100, 100, 0.1)',
                border: '1px solid rgba(255, 100, 100, 0.5)',
                borderRadius: '4px',
                color: '#ff6464',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: '600',
              }}
            >
              ✕ Clear
            </button>
          )}
        </div>

        {showResumeInput && (
          <textarea
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            placeholder="Paste your resume here..."
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '10px',
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(0, 212, 255, 0.3)',
              borderRadius: '4px',
              color: '#e0e0e0',
              fontSize: '12px',
              fontFamily: 'monospace',
              resize: 'vertical',
            }}
          />
        )}
      </div>

      {/* Job Description Section */}
      <div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
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
            <input type="file" accept=".txt" onChange={handleJobDescUpload} style={{ display: 'none' }} />
          </label>

          <button
            onClick={() => setShowJobDescInput(!showJobDescInput)}
            style={{
              padding: '8px 12px',
              background: 'rgba(0, 212, 255, 0.1)',
              border: '1px dashed rgba(0, 212, 255, 0.5)',
              borderRadius: '4px',
              color: '#00d4ff',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
              transition: 'all 0.3s',
            }}
          >
            📝 {jobDesc ? '✓ Edit Job Desc' : 'Paste Job Desc'}
          </button>

          {jobDesc && (
            <button
              onClick={() => setJobDesc('')}
              style={{
                padding: '8px 12px',
                background: 'rgba(255, 100, 100, 0.1)',
                border: '1px solid rgba(255, 100, 100, 0.5)',
                borderRadius: '4px',
                color: '#ff6464',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: '600',
              }}
            >
              ✕ Clear
            </button>
          )}
        </div>

        {showJobDescInput && (
          <textarea
            value={jobDesc}
            onChange={(e) => setJobDesc(e.target.value)}
            placeholder="Paste the job description here..."
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '10px',
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(0, 212, 255, 0.3)',
              borderRadius: '4px',
              color: '#e0e0e0',
              fontSize: '12px',
              fontFamily: 'monospace',
              resize: 'vertical',
            }}
          />
        )}
      </div>

      {(resume || jobDesc) && (
        <div style={{ fontSize: '11px', color: '#888', marginTop: '12px' }}>
          💡 Hints will now be personalized based on your resume & role
        </div>
      )}
    </div>
  );
}

export default ContextUpload;
