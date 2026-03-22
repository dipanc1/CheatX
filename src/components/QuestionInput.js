import React from 'react';

function QuestionInput({
  question,
  setQuestion,
  category,
  setCategory,
  categories,
  onGenerate,
  loading,
  error,
}) {
  return (
    <div className="question-input">
      <label>Interview Question</label>
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Paste or type the interview question here..."
        disabled={loading}
      />

      <label style={{ marginTop: '15px' }}>Question Type</label>
      <div className="category-selector">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`category-btn ${category === cat ? 'active' : ''}`}
            onClick={() => setCategory(cat)}
            disabled={loading}
          >
            {cat.toUpperCase()}
          </button>
        ))}
      </div>

      <button
        className="btn-generate"
        onClick={onGenerate}
        disabled={loading}
        style={{ marginTop: '15px' }}
      >
        {loading ? 'Generating...' : '⚡ Get Hints'}
      </button>

      {error && <div className="error">{error}</div>}
    </div>
  );
}

export default QuestionInput;
