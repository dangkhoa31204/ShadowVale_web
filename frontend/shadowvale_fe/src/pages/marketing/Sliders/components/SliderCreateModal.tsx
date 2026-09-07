import React, { useState } from 'react';
import { Input } from '../../../../components/ui/Input';

interface SliderCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSliderCreated?: (slider: any) => void;
}

const PRESET_IMAGES = [
  {
    label: 'Cyber Ops / Operative',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC1TAveBg2GPcBL31FKmcnmpwrErhznN-Zf2lkQJLuVHVio9i1AbPCSX3mZvNf6dYUYqP-Z4fQCNOvZAsDEYP3DRtkolmvP6OJ4GfYmp5srPNsgI6S5sY9wSuged9aS4DX21tDq-nwSJc2inT6WBFDU2I2Fww59c3VhnllKYieKY59FrhukA09lWZmlecxYtrt3YiHvCmnXf5vYtvtchP-sD3I60rk5iWcMKCfL4CVwHLZ9I58VzJYUeA',
  },
  {
    label: 'Neural Matrix / AI',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBHGdQOx9E73Z7GfQlJxmbeNj_tR5q-gnSRqhvi6fXdU5EwG5hbqTEeF3ERSKckfN8CWIb_zItsASOYF5KJ6WTswl99MDxm3C40WsCatfh-0q79d_hu2zuOPuMJeDLnwVPGOkxpU8QWnmw30qerjY9XmGYOFnN41YHIOYDmDiqcDnEVe7hMRg4qMGksUp9si_32_AOqel9Kjv-wBnYHVATHCwWLEEQACiNr7XRgn1INOXV7VV1y8IYW0Q',
  },
  {
    label: 'Tactical Armory / Weaponry',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBTwA19zXscAHdhX-S_TBivSufz7CL4VCKS7IONN50a4fZbjt9l0v2QukSUJTwiIBdxeoq0k3M4pdAunS0h9kqwzUCKfisW7GT8BSF6LmqkXoxstMk-KHESvUOp20rh6ZCBqvbbZKftaBcsFpqmSLejIXakZbvjbszMdZ9MyWRlg2Iu_NB5rjDpeFAFqU0gUGYaEQpwoPepx4wv4P9K3PusMG8WwjBwUxgdJl_OSu0ledJhRTkz-vc2hA',
  },
];

export const SliderCreateModal: React.FC<SliderCreateModalProps> = ({
  isOpen,
  onClose,
  onSliderCreated,
}) => {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [image, setImage] = useState(PRESET_IMAGES[0].url);
  const [order, setOrder] = useState('1');
  const [start, setStart] = useState('2024-11-01 00:00Z');
  const [end, setEnd] = useState('2025-01-01 00:00Z');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleReset = () => {
    setTitle('');
    setDesc('');
    setImage(PRESET_IMAGES[0].url);
    setOrder('1');
    setStatus('ACTIVE');
    setErrorMessage('');
    setIsSuccess(false);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!title.trim() || !desc.trim()) {
      setErrorMessage('Title and description are required for banner broadcast.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);

      if (onSliderCreated) {
        onSliderCreated({
          id: Date.now(),
          title: title.trim(),
          desc: desc.trim(),
          image,
          order,
          start,
          end,
          status,
        });
      }

      setTimeout(() => {
        handleReset();
      }, 1200);
    }, 850);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-surface-container-low border border-border-subtle rounded-lg w-full max-w-2xl shadow-2xl overflow-hidden relative animate-fade-in max-h-[90vh] flex flex-col">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-primary"></div>

        {/* Header */}
        <div className="bg-surface-bright border-b border-border-subtle px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">view_carousel</span>
            <div>
              <h3 className="font-display-lg text-lg text-on-surface leading-tight">
                Create Broadcast Banner / Slider
              </h3>
              <p className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">
                Hero Carousel Management System
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

        {/* Body */}
        {isSuccess ? (
          <div className="p-8 flex flex-col items-center justify-center text-center gap-3 animate-fade-in my-auto">
            <div className="w-14 h-14 rounded-full bg-success/10 border border-success/30 flex items-center justify-center text-success">
              <span className="material-symbols-outlined text-3xl">check_circle</span>
            </div>
            <h4 className="font-display-lg text-xl text-on-surface">Banner Broadcast Primed</h4>
            <p className="font-data-mono text-xs text-on-surface-variant max-w-md">
              Banner <span className="text-primary font-bold">"{title}"</span> has been configured at Display Order <span className="text-on-surface font-semibold">#{order}</span> with status <span className="text-success font-bold">{status}</span>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto">
            {errorMessage && (
              <div className="bg-error-container/20 border border-error/40 rounded p-3 text-error font-data-mono text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">warning</span>
                {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Input
                  id="slider-title"
                  label="Banner Headline"
                  icon="campaign"
                  required
                  placeholder="e.g. Operation Deep Winter: Protocol Active"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-0.5" htmlFor="slider-order">
                  Display Order
                </label>
                <select
                  id="slider-order"
                  value={order}
                  onChange={(e) => setOrder(e.target.value)}
                  className="w-full bg-surface-dim border border-border-subtle rounded-DEFAULT py-2 px-3 text-on-surface font-data-mono text-data-mono focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="1">Priority 1 (Primary)</option>
                  <option value="2">Priority 2</option>
                  <option value="3">Priority 3</option>
                  <option value="4">Priority 4</option>
                  <option value="5">Priority 5</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-0.5" htmlFor="slider-desc">
                Banner Synopsis / Subtitle
              </label>
              <textarea
                id="slider-desc"
                rows={2}
                required
                placeholder="Tactical summary displayed across the hero carousel viewport..."
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="w-full bg-surface-dim border border-border-subtle rounded-DEFAULT p-3 text-on-surface font-body-md text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none placeholder:text-on-surface-variant/50"
              />
            </div>

            {/* Image selection and live preview */}
            <div className="flex flex-col gap-2">
              <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                Hero Image Asset
              </label>
              
              <div className="flex gap-2 flex-wrap mb-1">
                {PRESET_IMAGES.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setImage(preset.url)}
                    className={`text-[11px] font-data-mono px-2.5 py-1 rounded border transition-colors cursor-pointer ${
                      image === preset.url
                        ? 'bg-primary/20 text-primary border-primary'
                        : 'bg-surface border-border-subtle text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Preset: {preset.label}
                  </button>
                ))}
              </div>

              <Input
                id="slider-img"
                icon="image"
                placeholder="https://..."
                value={image}
                onChange={(e) => setImage(e.target.value)}
                helperText="Enter custom image URL or choose preset above."
              />

              {/* Preview Thumbnail */}
              {image && (
                <div className="relative h-32 w-full rounded border border-border-subtle overflow-hidden bg-surface-container mt-1 group">
                  <img
                    src={image}
                    alt="Slider Preview"
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = PRESET_IMAGES[0].url;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent flex items-end p-3">
                    <span className="font-data-mono text-xs text-on-surface font-bold truncate">
                      {title || 'Banner Preview'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Campaign Window & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                id="slider-start"
                label="Campaign Start"
                icon="schedule"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />

              <Input
                id="slider-end"
                label="Campaign End"
                icon="event_busy"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />

              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-0.5" htmlFor="slider-status">
                  Initial Status
                </label>
                <select
                  id="slider-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                  className="w-full bg-surface-dim border border-border-subtle rounded-DEFAULT py-2 px-3 text-on-surface font-data-mono text-data-mono focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-2 pt-4 border-t border-border-subtle flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 rounded border border-outline-variant text-on-surface font-label-caps text-label-caps hover:bg-surface-container transition-colors cursor-pointer"
              >
                ABORT
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2 rounded bg-primary text-on-primary font-label-caps text-label-caps hover:bg-primary-container hover:text-on-primary-container transition-all flex items-center gap-2 font-bold cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] loading-spinner">sync</span>
                    <span>BROADCASTING...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">add_photo_alternate</span>
                    <span>DEPLOY SLIDER</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
