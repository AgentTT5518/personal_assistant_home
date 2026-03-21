import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useTags, useAddTagsToTransaction, useRemoveTagFromTransaction } from '../hooks.js';
import { TagBadge } from './tag-badge.js';
import type { TagInfo } from '@shared/types/index.js';

interface TagSelectorProps {
  transactionId: string;
  currentTags: TagInfo[];
}

export function TagSelector({ transactionId, currentTags }: TagSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: allTags = [] } = useTags();
  const addTags = useAddTagsToTransaction();
  const removeTag = useRemoveTagFromTransaction();

  const currentTagIds = new Set(currentTags.map((t) => t.id));
  const availableTags = allTags.filter((t) => !currentTagIds.has(t.id));

  const handleAdd = (tagId: string) => {
    addTags.mutate({ transactionId, tagIds: [tagId] });
  };

  const handleRemove = (tagId: string) => {
    removeTag.mutate({ transactionId, tagId });
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      {currentTags.map((tag) => (
        <TagBadge
          key={tag.id}
          name={tag.name}
          color={tag.color}
          onRemove={() => handleRemove(tag.id)}
        />
      ))}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-gray-300 px-1.5 py-0.5 text-xs text-gray-500 hover:border-gray-400 hover:text-gray-600"
          aria-label="Add tag"
        >
          {isOpen ? <X size={12} /> : <Plus size={12} />}
        </button>
        {isOpen && availableTags.length > 0 && (
          <div className="absolute left-0 top-full z-10 mt-1 min-w-[140px] rounded-md border border-gray-200 bg-white py-1 shadow-lg">
            {availableTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => {
                  handleAdd(tag.id);
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-gray-50"
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
