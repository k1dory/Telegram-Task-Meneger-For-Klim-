import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotesStore, useAppStore } from '@/store';
import { Card, Button, Input, Badge } from '@/components/ui';
import { cn, formatRelativeDate } from '@/utils';
import type { Item } from '@/types';

interface NotesBoardProps {
  boardId: string;
}

const NotesBoard = ({ boardId }: NotesBoardProps) => {
  const { notes, fetchNotes, isLoading, togglePin } = useNotesStore();
  const { openModal } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNote, setSelectedNote] = useState<Item | null>(null);

  useEffect(() => {
    fetchNotes(boardId);
  }, [boardId, fetchNotes]);

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.content || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedNotes = filteredNotes.filter((n) => n.metadata?.pinned);
  const otherNotes = filteredNotes.filter((n) => !n.metadata?.pinned);

  const handleNoteClick = (note: Item) => {
    setSelectedNote(note);
    openModal('editNote', note);
  };

  const NoteCard = ({ note }: { note: Item }) => {
    const color = note.metadata?.color || '#6366f1';
    const tags = note.metadata?.tags || [];

    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => handleNoteClick(note)}
        className="cursor-pointer"
      >
        <Card
          variant="bordered"
          className="h-full"
          style={{ borderLeftColor: color, borderLeftWidth: 3 }}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-medium text-dark-100 line-clamp-1">{note.title}</h3>
            {note.metadata?.pinned && (
              <svg
                className="w-4 h-4 text-primary-400 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
            )}
          </div>

          <p className="text-sm text-dark-400 line-clamp-3 mb-3">{note.content || ''}</p>

          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="default" size="sm">
                  {tag}
                </Badge>
              ))}
              {tags.length > 2 && (
                <Badge variant="default" size="sm">
                  +{tags.length - 2}
                </Badge>
              )}
            </div>
            <span className="text-xs text-dark-500">{formatRelativeDate(note.updated_at)}</span>
          </div>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search and Add */}
      <div className="flex gap-3">
        <Input
          placeholder="Поиск заметок..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          }
        />
        <Button onClick={() => openModal('createNote', { boardId })}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 bg-dark-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Pinned Notes */}
          {pinnedNotes.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-dark-400 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                Закрепленные
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AnimatePresence>
                  {pinnedNotes.map((note) => (
                    <NoteCard key={note.id} note={note} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Other Notes */}
          {otherNotes.length > 0 && (
            <div className="space-y-3">
              {pinnedNotes.length > 0 && (
                <h3 className="text-sm font-medium text-dark-400">Остальные</h3>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AnimatePresence>
                  {otherNotes.map((note) => (
                    <NoteCard key={note.id} note={note} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredNotes.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-800 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-dark-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="text-dark-400 mb-4">
                {searchQuery ? 'Заметки не найдены' : 'Нет заметок'}
              </p>
              {!searchQuery && (
                <Button onClick={() => openModal('createNote', { boardId })}>
                  Создать заметку
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NotesBoard;
