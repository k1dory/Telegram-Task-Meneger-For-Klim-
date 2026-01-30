import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/layout';
import { Tabs, TabsList, TabsTrigger, TabsContent, Progress, Button, Modal } from '@/components/ui';
import {
  NotesBoard,
  KanbanBoard,
  ChecklistBoard,
  TimeManagerBoard,
  CalendarBoard,
  HabitTrackerBoard,
} from '@/components/boards';
import { useFoldersStore, useAppStore } from '@/store';
import { boardTypeLabels, boardTypeIcons, calculateProgress } from '@/utils';
import type { BoardType } from '@/types';

const boardComponents: Record<BoardType, React.ComponentType<{ folderId: string }>> = {
  notes: NotesBoard,
  kanban: KanbanBoard,
  checklist: ChecklistBoard,
  'time-manager': TimeManagerBoard,
  calendar: CalendarBoard,
  'habit-tracker': HabitTrackerBoard,
};

const FolderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentFolder, fetchFolderById, deleteFolder, isLoading } = useFoldersStore();
  const { openModal, closeModal, activeModal } = useAppStore();
  const [activeBoard, setActiveBoard] = useState<BoardType | null>(null);

  useEffect(() => {
    if (id) {
      fetchFolderById(id);
    }
  }, [id, fetchFolderById]);

  useEffect(() => {
    if (currentFolder && !activeBoard) {
      setActiveBoard(currentFolder.boardTypes[0] || 'checklist');
    }
  }, [currentFolder, activeBoard]);

  const handleDelete = async () => {
    if (id) {
      await deleteFolder(id);
      closeModal();
      navigate('/folders');
    }
  };

  if (isLoading || !currentFolder) {
    return (
      <div className="space-y-6">
        <div className="h-20 bg-dark-800 rounded-2xl animate-pulse" />
        <div className="h-12 bg-dark-800 rounded-xl animate-pulse" />
        <div className="h-96 bg-dark-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  const progress = calculateProgress(currentFolder.completedCount, currentFolder.taskCount);
  const BoardComponent = activeBoard ? boardComponents[activeBoard] : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <PageHeader
        title={currentFolder.name}
        showBack
        action={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => openModal('editFolder')}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => openModal('deleteFolder')}>
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </Button>
          </div>
        }
      />

      {/* Folder Stats */}
      <div
        className="p-4 rounded-2xl"
        style={{ backgroundColor: `${currentFolder.color}15` }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
            style={{ backgroundColor: `${currentFolder.color}30` }}
          >
            {currentFolder.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-dark-300">Прогресс</span>
              <span className="text-sm font-medium text-dark-200">
                {currentFolder.completedCount} / {currentFolder.taskCount}
              </span>
            </div>
            <Progress value={progress} size="md" color="primary" />
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold" style={{ color: currentFolder.color }}>
              {progress}%
            </span>
          </div>
        </div>
      </div>

      {/* Board Tabs */}
      {currentFolder.boardTypes.length > 1 ? (
        <Tabs
          defaultValue={activeBoard || currentFolder.boardTypes[0]}
          value={activeBoard || undefined}
          onValueChange={(value) => setActiveBoard(value as BoardType)}
        >
          <TabsList className="overflow-x-auto">
            {currentFolder.boardTypes.map((type) => (
              <TabsTrigger key={type} value={type}>
                {boardTypeLabels[type]}
              </TabsTrigger>
            ))}
          </TabsList>

          {currentFolder.boardTypes.map((type) => (
            <TabsContent key={type} value={type} className="mt-4">
              {boardComponents[type] && (
                <div>
                  {React.createElement(boardComponents[type], { folderId: currentFolder.id })}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        BoardComponent && <BoardComponent folderId={currentFolder.id} />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={activeModal === 'deleteFolder'}
        onClose={closeModal}
        title="Удалить папку?"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>
              Отмена
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Удалить
            </Button>
          </>
        }
      >
        <p className="text-dark-300">
          Вы уверены, что хотите удалить папку "{currentFolder.name}"? Все задачи и заметки в ней будут удалены безвозвратно.
        </p>
      </Modal>
    </motion.div>
  );
};

// Need to import React for createElement
import React from 'react';

export default FolderDetail;
