import { useState } from 'react';
import { X, Plus, Pencil, Trash2 } from 'lucide-react';
import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from '../hooks.js';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#78716c',
];

interface TagManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TagManager({ isOpen, onClose }: TagManagerProps) {
  const { data: tags = [] } = useTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!newName.trim()) return;
    createTag.mutate({ name: newName.trim(), color: newColor }, {
      onSuccess: () => {
        setNewName('');
        setNewColor('#3b82f6');
      },
    });
  };

  const handleUpdate = (id: string) => {
    if (!editName.trim()) return;
    updateTag.mutate({ id, data: { name: editName.trim(), color: editColor } }, {
      onSuccess: () => setEditingId(null),
    });
  };

  const handleDelete = (id: string) => {
    deleteTag.mutate(id);
  };

  const startEdit = (id: string, name: string, color: string) => {
    setEditingId(id);
    setEditName(name);
    setEditColor(color);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Manage Tags</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Create new tag */}
        <div className="mb-4 flex items-center gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New tag name"
            className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <div className="flex gap-1">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className={`h-5 w-5 rounded-full border-2 ${newColor === c ? 'border-gray-800' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!newName.trim() || createTag.isPending}
            className="rounded-md bg-blue-600 p-1.5 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Tag list */}
        <div className="max-h-[300px] space-y-2 overflow-y-auto">
          {tags.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-500">No tags yet. Create one above.</p>
          )}
          {tags.map((tag) => (
            <div key={tag.id} className="flex items-center gap-2 rounded-md border border-gray-100 p-2">
              {editingId === tag.id ? (
                <>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdate(tag.id)}
                  />
                  <div className="flex gap-1">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditColor(c)}
                        className={`h-4 w-4 rounded-full border-2 ${editColor === c ? 'border-gray-800' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                        aria-label={`Color ${c}`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUpdate(tag.id)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="flex-1 text-sm text-gray-800">{tag.name}</span>
                  <span className="text-xs text-gray-400">{tag.usageCount} uses</span>
                  <button
                    type="button"
                    onClick={() => startEdit(tag.id, tag.name, tag.color)}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label={`Edit tag ${tag.name}`}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(tag.id)}
                    className="text-gray-400 hover:text-red-500"
                    aria-label={`Delete tag ${tag.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
