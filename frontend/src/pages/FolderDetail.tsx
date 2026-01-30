import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/layout';
import { Tabs, TabsList, TabsTrigger, TabsContent, Progress, Button } from '@/components/ui';
import {
  NotesBoard,
  KanbanBoard,
  ChecklistBoard,
  TimeManagerBoard,
  CalendarBoard,
  HabitTrackerBoard,
} from '@/components/boards';
import { useFoldersStore, useAppStore } from '@/store';
import { boardTypeLabels, calculateProgress } from '@/utils';
import type { BoardType, Board } from '@/types';
import React from 'react';

// Board components now accept boardId instead of folderId
const boardComponents: Record<BoardType, React.ComponentType<{ boardId: string }>> = {
  notes: NotesBoard,
  kanban: KanbanBoard,
  checklist: ChecklistBoard,
  time_manager: TimeManagerBoard,
  calendar: CalendarBoard,
  habit_tracker: HabitTrackerBoard,
};

const FolderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { currentFolder, fetchFolderById, isLoading } = useFoldersStore();
  const { openModal, setLastActiveBoardId } = useAppStore();
  const [activeBoard, setActiveBoard] = useState<Board | null>(null);

  useEffect(() => {
    if (id) {
      fetchFolderById(id);
    }
  }, [id, fetchFolderById]);

  useEffect(() => {
    // Set the first board as active when folder loads
    if (currentFolder?.boards?.length && !activeBoard) {
      setActiveBoard(currentFolder.boards[0]);
    }
  }, [currentFolder, activeBoard]);

  // Track last active board for quick create from BottomNav
  useEffect(() => {
    if (!activeBoard) return;
    if (['kanban', 'checklist', 'time_manager'].includes(activeBoard.type)) {
      setLastActiveBoardId(activeBoard.id);
    }
  }, [activeBoard, setLastActiveBoardId]);

  const handleBoardChange = (boardType: string) => {
    const board = currentFolder?.boards?.find(b => b.type === boardType);
    if (board) {
      setActiveBoard(board);
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

  const boards = currentFolder.boards || [];
  const progress = calculateProgress(0, 0); // TODO: Get from analytics
  const BoardComponent = activeBoard ? boardComponents[activeBoard.type as BoardType] : null;

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
            <Button variant="ghost" size="sm" onClick={() => openModal('createBoard')}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </Button>
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
            {currentFolder.icon || '📁'}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-dark-300">Досок: {boards.length}</span>
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
      {boards.length > 1 ? (
        <Tabs
          defaultValue={activeBoard?.type || boards[0]?.type}
          value={activeBoard?.type}
          onValueChange={handleBoardChange}
        >
          <TabsList className="overflow-x-auto">
            {boards.map((board) => (
              <TabsTrigger key={board.id} value={board.type}>
                {boardTypeLabels[board.type as BoardType] || board.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {boards.map((board) => (
            <TabsContent key={board.id} value={board.type} className="mt-4">
              {boardComponents[board.type as BoardType] && (
                <div>
                  {React.createElement(boardComponents[board.type as BoardType], { boardId: board.id })}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      ) : activeBoard && BoardComponent ? (
        <BoardComponent boardId={activeBoard.id} />
      ) : (
        <div className="text-center py-12 text-dark-400">
          Нет досок в этой папке. Создайте доску чтобы начать.
          <div className="mt-4">
            <Button onClick={() => openModal('createBoard')}>Создать доску</Button>
          </div>
        </div>
      )}

    </motion.div>
  );
};

export default FolderDetail;
