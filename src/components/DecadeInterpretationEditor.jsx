import { useState, useEffect, memo } from 'react';
import { Save, Wand2, CheckCircle, X, Loader } from 'lucide-react';

const DecadeInterpretationEditor = memo(function DecadeInterpretationEditor({
  initialText,
  placeholder,
  onSavePrimary,
  onSaveFinal,
  onAiRewrite,
  onCancel,
  isSaving,
  isAiGenerating
}) {
  const [text, setText] = useState(initialText || '');

  useEffect(() => {
    setText(initialText || '');
  }, [initialText]);

  return (
    <div className="area-edit-form">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        rows={4}
      />
      <div className="edit-actions">
        <button
          className="btn btn-save-primary"
          onClick={() => onSavePrimary(text)}
          disabled={isSaving || isAiGenerating}
        >
          {isSaving ? <Loader size={12} className="spinning" /> : <Save size={12} />}
          1차해석 저장
        </button>
        <button
          className="btn btn-ai-rewrite"
          onClick={() => onAiRewrite(text)}
          disabled={isSaving || isAiGenerating || !text.trim()}
        >
          {isAiGenerating ? <Loader size={12} className="spinning" /> : <Wand2 size={12} />}
          AI 재작성
        </button>
        <button
          className="btn btn-save-final"
          onClick={() => onSaveFinal(text)}
          disabled={isSaving || isAiGenerating}
        >
          <CheckCircle size={12} />
          최종해석 저장
        </button>
        <button
          className="btn btn-cancel"
          onClick={onCancel}
          disabled={isSaving || isAiGenerating}
        >
          <X size={12} />
          취소
        </button>
      </div>
    </div>
  );
});

export default DecadeInterpretationEditor;
