import React, { useState } from 'react';
import { X, Search, Keyboard } from 'lucide-react';

interface ShortcutGroup {
  name: string;
  shortcuts: {
    keys: string[];
    description: string;
  }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    name: 'General',
    shortcuts: [
      { keys: ['Ctrl', 'Z'], description: 'Undo' },
      { keys: ['Ctrl', 'Y'], description: 'Redo' },
      { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo (alternative)' },
      { keys: ['Ctrl', 'S'], description: 'Save project' },
      { keys: ['Ctrl', 'N'], description: 'New project' },
      { keys: ['Ctrl', 'E'], description: 'Export design' },
      { keys: ['?'], description: 'Show keyboard shortcuts' },
    ],
  },
  {
    name: 'Canvas Navigation',
    shortcuts: [
      { keys: ['Space', 'Drag'], description: 'Pan canvas' },
      { keys: ['Ctrl', '+'], description: 'Zoom in' },
      { keys: ['Ctrl', '-'], description: 'Zoom out' },
      { keys: ['Ctrl', '0'], description: 'Reset zoom to 100%' },
      { keys: ['Ctrl', '1'], description: 'Fit canvas to screen' },
      { keys: ['Scroll'], description: 'Zoom in/out' },
    ],
  },
  {
    name: 'Selection',
    shortcuts: [
      { keys: ['Click'], description: 'Select object' },
      { keys: ['Shift', 'Click'], description: 'Add to selection' },
      { keys: ['Ctrl', 'A'], description: 'Select all objects' },
      { keys: ['Ctrl', 'D'], description: 'Duplicate selection' },
      { keys: ['Escape'], description: 'Deselect all' },
      { keys: ['Tab'], description: 'Cycle through objects' },
    ],
  },
  {
    name: 'Object Manipulation',
    shortcuts: [
      { keys: ['Delete'], description: 'Delete selection' },
      { keys: ['Backspace'], description: 'Delete selection' },
      { keys: ['Ctrl', 'G'], description: 'Group selected objects' },
      { keys: ['Ctrl', 'Shift', 'G'], description: 'Ungroup selection' },
      { keys: ['Arrow Keys'], description: 'Move selection 1px' },
      { keys: ['Shift', 'Arrow'], description: 'Move selection 10px' },
      { keys: ['Ctrl', 'C'], description: 'Copy selection' },
      { keys: ['Ctrl', 'V'], description: 'Paste' },
      { keys: ['Ctrl', 'X'], description: 'Cut selection' },
    ],
  },
  {
    name: 'Text Editing',
    shortcuts: [
      { keys: ['Double Click'], description: 'Edit text object' },
      { keys: ['Ctrl', 'B'], description: 'Toggle bold' },
      { keys: ['Ctrl', 'I'], description: 'Toggle italic' },
      { keys: ['Ctrl', 'U'], description: 'Toggle underline' },
      { keys: ['Ctrl', 'L'], description: 'Align text left' },
      { keys: ['Ctrl', 'E'], description: 'Align text center' },
      { keys: ['Ctrl', 'R'], description: 'Align text right' },
    ],
  },
  {
    name: 'Layers',
    shortcuts: [
      { keys: ['Ctrl', ']'], description: 'Bring forward' },
      { keys: ['Ctrl', '['], description: 'Send backward' },
      { keys: ['Ctrl', 'Shift', ']'], description: 'Bring to front' },
      { keys: ['Ctrl', 'Shift', '['], description: 'Send to back' },
    ],
  },
  {
    name: 'Drawing',
    shortcuts: [
      { keys: ['B'], description: 'Brush tool' },
      { keys: ['P'], description: 'Pen tool' },
      { keys: ['R'], description: 'Rectangle tool' },
      { keys: ['O'], description: 'Circle tool' },
      { keys: ['T'], description: 'Text tool' },
      { keys: ['V'], description: 'Selection tool' },
      { keys: ['Enter'], description: 'Finish pen path' },
      { keys: ['Escape'], description: 'Cancel drawing' },
    ],
  },
];

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredGroups = SHORTCUT_GROUPS.map((group) => ({
    ...group,
    shortcuts: group.shortcuts.filter(
      (s) =>
        s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.keys.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()))
    ),
  })).filter((group) => group.shortcuts.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#101018] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-600/20">
              <Keyboard className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100">Keyboard Shortcuts</h2>
              <p className="text-xs text-zinc-500">Master these to design faster</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-white/[0.08]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search shortcuts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-white/[0.08] focus:border-violet-500 rounded-lg py-2.5 pl-10 pr-4 text-sm text-zinc-200 outline-none transition-colors placeholder:text-zinc-600"
              autoFocus
            />
          </div>
        </div>

        {/* Group Tabs */}
        <div className="px-6 py-3 border-b border-white/[0.08] flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveGroup(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeGroup === null
                ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30'
                : 'bg-zinc-900 text-zinc-400 border border-white/[0.08] hover:border-zinc-700'
            }`}
          >
            All
          </button>
          {SHORTCUT_GROUPS.map((group) => (
            <button
              key={group.name}
              onClick={() => setActiveGroup(group.name)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                activeGroup === group.name
                  ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30'
                  : 'bg-zinc-900 text-zinc-400 border border-white/[0.08] hover:border-zinc-700'
              }`}
            >
              {group.name}
            </button>
          ))}
        </div>

        {/* Shortcuts List */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredGroups
            .filter((group) => activeGroup === null || group.name === activeGroup)
            .map((group) => (
              <div key={group.name} className="mb-6 last:mb-0">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
                  {group.name}
                </h3>
                <div className="flex flex-col gap-2">
                  {group.shortcuts.map((shortcut, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2 px-3 bg-zinc-900/50 rounded-lg"
                    >
                      <span className="text-sm text-zinc-300">
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIdx) => (
                          <React.Fragment key={keyIdx}>
                            <kbd className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-[10px] font-mono font-semibold text-zinc-300 min-w-[24px] text-center">
                              {key}
                            </kbd>
                            {keyIdx < shortcut.keys.length - 1 && (
                              <span className="text-zinc-600 text-xs">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

          {filteredGroups.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-semibold">No shortcuts found</p>
              <p className="text-xs mt-1">Try a different search term</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.08] bg-zinc-900/30">
          <p className="text-[10px] text-zinc-500 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-[9px] font-mono">?</kbd> anywhere to open this panel
          </p>
        </div>
      </div>
    </div>
  );
};
