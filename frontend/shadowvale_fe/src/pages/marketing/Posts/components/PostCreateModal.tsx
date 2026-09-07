import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../../../../components/ui/Input';

interface PostCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: (post: any) => void;
}

export const PostCreateModal: React.FC<PostCreateModalProps> = ({
  isOpen,
  onClose,
  onPostCreated,
}) => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Worldbuilding');
  const [author, setAuthor] = useState('A. Vance');
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleReset = () => {
    setTitle('');
    setCategory('Worldbuilding');
    setAuthor('A. Vance');
    setSummary('');
    setStatus('draft');
    setErrorMessage('');
    setIsSuccess(false);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent, openEditor = false) => {
    e.preventDefault();
    setErrorMessage('');

    if (!title.trim()) {
      setErrorMessage('Briefing title is mandatory for tactical indexing.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      const newId = `DOC-${Math.floor(100 + Math.random() * 900)}X`;
      
      if (onPostCreated) {
        onPostCreated({
          id: newId,
          title: title.trim(),
          category,
          author,
          summary,
          status,
          updated: 'Just now',
          archived: false,
        });
      }

      setTimeout(() => {
        handleReset();
        if (openEditor) {
          navigate(`/marketing/posts/${newId}`);
        }
      }, 1000);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-surface-container-low border border-border-subtle rounded-lg w-full max-w-xl shadow-2xl overflow-hidden relative animate-fade-in">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-primary"></div>

        {/* Modal Header */}
        <div className="bg-surface-bright border-b border-border-subtle px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">post_add</span>
            <div>
              <h3 className="font-display-lg text-lg text-on-surface leading-tight">
                Initialize Intelligence Briefing
              </h3>
              <p className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">
                Marketing & Tactical Distribution Channel
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="text-on-surface-variant hover:text-on-surface transition-colors p-1"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Modal Body */}
        {isSuccess ? (
          <div className="p-8 flex flex-col items-center justify-center text-center gap-3 animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-success/10 border border-success/30 flex items-center justify-center text-success">
              <span className="material-symbols-outlined text-3xl">done_all</span>
            </div>
            <h4 className="font-display-lg text-xl text-on-surface">Briefing Node Created</h4>
            <p className="font-data-mono text-xs text-on-surface-variant max-w-md">
              The intelligence document <span className="text-primary font-bold">"{title}"</span> has been indexed in category <span className="text-on-surface font-semibold">{category}</span> as <span className="uppercase text-warning font-bold">{status}</span>.
            </p>
          </div>
        ) : (
          <form onSubmit={(e) => handleSubmit(e, false)} className="p-6 flex flex-col gap-4">
            {errorMessage && (
              <div className="bg-error-container/20 border border-error/40 rounded p-3 text-error font-data-mono text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">warning</span>
                {errorMessage}
              </div>
            )}

            <Input
              id="post-title"
              label="Briefing Title"
              icon="title"
              required
              placeholder="e.g. Operation Nightfall: Level Architecture"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-0.5" htmlFor="post-category">
                  Classification / Category
                </label>
                <select
                  id="post-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-surface-dim border border-border-subtle rounded-DEFAULT py-2 px-3 text-on-surface font-data-mono text-data-mono focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="Worldbuilding">Worldbuilding</option>
                  <option value="Mechanics">Mechanics</option>
                  <option value="Release Notes">Release Notes</option>
                  <option value="Events">Events</option>
                  <option value="AI Development">AI Development</option>
                </select>
              </div>

              <Input
                id="post-author"
                label="Author Callsign"
                icon="person"
                required
                placeholder="e.g. S. Reynolds"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-0.5" htmlFor="post-summary">
                Briefing Synopsis / Abstract
              </label>
              <textarea
                id="post-summary"
                rows={3}
                placeholder="Enter executive briefing summary for tactical operatives..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full bg-surface-dim border border-border-subtle rounded-DEFAULT p-3 text-on-surface font-body-md text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none placeholder:text-on-surface-variant/50"
              />
            </div>

            <div className="flex items-center gap-4 bg-surface-container p-3 rounded border border-border-subtle">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Initial State:</span>
              <label className="flex items-center gap-2 cursor-pointer font-data-mono text-xs">
                <input
                  type="radio"
                  name="status"
                  value="draft"
                  checked={status === 'draft'}
                  onChange={() => setStatus('draft')}
                  className="text-warning focus:ring-warning"
                />
                <span className="text-warning font-bold">Draft</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-data-mono text-xs">
                <input
                  type="radio"
                  name="status"
                  value="published"
                  checked={status === 'published'}
                  onChange={() => setStatus('published')}
                  className="text-success focus:ring-success"
                />
                <span className="text-success font-bold">Published</span>
              </label>
            </div>

            {/* Modal Actions */}
            <div className="mt-2 pt-4 border-t border-border-subtle flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 rounded border border-outline-variant text-on-surface font-label-caps text-label-caps hover:bg-surface-container transition-colors cursor-pointer"
              >
                DISCARD
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={(e) => handleSubmit(e, true)}
                  className="px-4 py-2 rounded border border-primary/50 text-primary hover:bg-primary/10 font-label-caps text-label-caps transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">edit_square</span>
                  CREATE & OPEN EDITOR
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 rounded bg-primary text-on-primary font-label-caps text-label-caps hover:bg-primary-container hover:text-on-primary-container transition-all flex items-center gap-2 font-bold cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] loading-spinner">sync</span>
                      <span>INITIALIZING...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">add_circle</span>
                      <span>SAVE BRIEFING</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
