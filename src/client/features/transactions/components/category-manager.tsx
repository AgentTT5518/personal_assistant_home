import { useState } from 'react';
import { X, Plus, Trash2, ChevronDown, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useCategoryRules,
  useCreateCategoryRule,
  useDeleteCategoryRule,
} from '../hooks.js';

interface CategoryManagerProps {
  onClose: () => void;
}

const DEFAULT_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#6b7280'];

export function CategoryManager({ onClose }: CategoryManagerProps) {
  const { data: categories, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');
  const [newIcon] = useState('tag');
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newName.trim()) return;
    createCategory.mutate(
      { name: newName.trim(), color: newColor, icon: newIcon, parentId: newParentId },
      {
        onSuccess: () => {
          setNewName('');
          setShowCreateForm(false);
          setNewParentId(null);
        },
      },
    );
  };

  const handleDelete = (id: string) => {
    deleteCategory.mutate(id, { onSuccess: () => setDeleteConfirmId(null) });
  };

  const parents = categories?.filter((c) => !c.parentId) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Manage Categories</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-gray-400" size={24} />
            </div>
          ) : (
            <>
              {parents.map((parent) => {
                const children = categories?.filter((c) => c.parentId === parent.id) ?? [];
                const isExpanded = expandedId === parent.id;

                return (
                  <div key={parent.id} className="border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : parent.id)}
                          className="text-gray-400"
                        >
                          {children.length > 0 ? (
                            isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                          ) : (
                            <span className="w-4" />
                          )}
                        </button>
                        <span className="w-4 h-4 rounded-full" style={{ backgroundColor: parent.color }} />
                        <span className="font-medium text-gray-900">{parent.name}</span>
                        <span className="text-xs text-gray-400">{parent.transactionCount} txns</span>
                        {parent.isDefault && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Default</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!parent.isDefault && (
                          deleteConfirmId === parent.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-red-600">{parent.transactionCount} txns will be uncategorised</span>
                              <button onClick={() => handleDelete(parent.id)} className="text-xs text-red-600 font-medium hover:text-red-800">
                                Confirm
                              </button>
                              <button onClick={() => setDeleteConfirmId(null)} className="text-xs text-gray-500 hover:text-gray-700">
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirmId(parent.id)} className="text-gray-400 hover:text-red-500">
                              <Trash2 size={14} />
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-gray-100 divide-y divide-gray-50">
                        {children.map((child) => (
                          <div key={child.id} className="flex items-center justify-between px-4 py-2 pl-12">
                            <div className="flex items-center gap-3">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: child.color }} />
                              <span className="text-sm text-gray-700">{child.name}</span>
                              <span className="text-xs text-gray-400">{child.transactionCount} txns</span>
                            </div>
                            {!child.isDefault && (
                              <button onClick={() => handleDelete(child.id)} className="text-gray-400 hover:text-red-500">
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        ))}
                        {/* Rules section */}
                        <CategoryRulesSection categoryId={parent.id} />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Orphan categories (no parent, not a parent themselves) */}
              {categories
                ?.filter((c) => c.parentId && !parents.some((p) => p.id === c.parentId))
                .map((orphan) => (
                  <div key={orphan.id} className="flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="w-4 h-4 rounded-full" style={{ backgroundColor: orphan.color }} />
                      <span className="text-gray-700">{orphan.name}</span>
                      <span className="text-xs text-gray-400">{orphan.transactionCount} txns</span>
                    </div>
                  </div>
                ))}
            </>
          )}
        </div>

        {/* Footer — Create */}
        <div className="border-t border-gray-200 px-6 py-4">
          {showCreateForm ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Category name"
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                  autoFocus
                />
                <select
                  value={newParentId ?? ''}
                  onChange={(e) => setNewParentId(e.target.value || null)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">No parent (top-level)</option>
                  {parents.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                {DEFAULT_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={`w-6 h-6 rounded-full border-2 ${newColor === c ? 'border-gray-900' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim() || createCategory.isPending}
                  className="bg-blue-600 text-white text-sm px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {createCategory.isPending ? <Loader2 className="animate-spin" size={14} /> : 'Create'}
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2"
                >
                  Cancel
                </button>
                {createCategory.isError && (
                  <span className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {createCategory.error?.message}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
            >
              <Plus size={16} />
              New Category
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryRulesSection({ categoryId }: { categoryId: string }) {
  const { data: rules, isLoading } = useCategoryRules(categoryId);
  const createRule = useCreateCategoryRule();
  const deleteRule = useDeleteCategoryRule();
  const [showAddRule, setShowAddRule] = useState(false);
  const [newPattern, setNewPattern] = useState('');
  const [newField, setNewField] = useState<'description' | 'merchant'>('description');

  const handleAddRule = () => {
    if (!newPattern.trim()) return;
    createRule.mutate(
      { categoryId, pattern: newPattern.trim(), field: newField },
      { onSuccess: () => { setNewPattern(''); setShowAddRule(false); } },
    );
  };

  return (
    <div className="px-4 py-3 pl-12 bg-gray-50">
      <div className="text-xs font-medium text-gray-500 mb-2">Rules</div>
      {isLoading ? (
        <Loader2 className="animate-spin text-gray-400" size={14} />
      ) : (
        <>
          {rules && rules.length > 0 ? (
            <div className="space-y-1 mb-2">
              {rules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 text-gray-700">
                      {rule.pattern}
                    </code>
                    <span className="text-gray-400">on {rule.field}</span>
                    {rule.isAiGenerated && (
                      <span className="bg-purple-100 text-purple-600 px-1 py-0.5 rounded text-[10px]">AI</span>
                    )}
                  </div>
                  <button onClick={() => deleteRule.mutate(rule.id)} className="text-gray-400 hover:text-red-500">
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 mb-2">No rules yet</p>
          )}

          {showAddRule ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newPattern}
                onChange={(e) => setNewPattern(e.target.value)}
                placeholder="Regex pattern..."
                className="flex-1 text-xs border border-gray-300 rounded px-2 py-1"
                autoFocus
              />
              <select
                value={newField}
                onChange={(e) => setNewField(e.target.value as 'description' | 'merchant')}
                className="text-xs border border-gray-300 rounded px-1 py-1"
              >
                <option value="description">description</option>
                <option value="merchant">merchant</option>
              </select>
              <button onClick={handleAddRule} disabled={!newPattern.trim()} className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50">
                Add
              </button>
              <button onClick={() => setShowAddRule(false)} className="text-xs text-gray-500">
                Cancel
              </button>
              {createRule.isError && (
                <span className="text-xs text-red-600">{createRule.error?.message}</span>
              )}
            </div>
          ) : (
            <button onClick={() => setShowAddRule(true)} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
              <Plus size={10} /> Add Rule
            </button>
          )}
        </>
      )}
    </div>
  );
}
