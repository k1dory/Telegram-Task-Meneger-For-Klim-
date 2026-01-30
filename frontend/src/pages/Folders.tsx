import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/layout';
import { Card, Button, Input, Progress } from '@/components/ui';
import { useFoldersStore, useAppStore } from '@/store';
import { boardTypeLabels } from '@/utils';
import type { BoardType } from '@/types';

const Folders = () => {
  const { folders, fetchFolders, isLoading } = useFoldersStore();
  const { openModal } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const filteredFolders = folders.filter((folder) =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const FolderCard = ({ folder }: { folder: typeof folders[0] }) => {
    const boardTypes = folder.boards?.map(b => b.type as BoardType) || [];
    const boardCount = boardTypes.length;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Link to={`/folders/${folder.id}`}>
          <Card
            variant="bordered"
            interactive
            className="h-full relative overflow-hidden"
          >
            {/* Color accent */}
            <div
              className="absolute top-0 left-0 w-full h-1"
              style={{ backgroundColor: folder.color }}
            />

            <div className="flex items-start justify-between mb-3 pt-2">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${folder.color}20` }}
              >
                {folder.icon || '📁'}
              </div>
              <div className="text-right">
                <p className="text-xs text-dark-400">Досок</p>
                <p className="text-sm font-medium text-dark-200">
                  {boardCount}
                </p>
              </div>
            </div>

            <h3 className="font-semibold text-dark-100 mb-1">{folder.name}</h3>

            <div className="flex flex-wrap gap-1 mb-3">
              {boardTypes.slice(0, 3).map((type) => (
                <span
                  key={type}
                  className="text-[10px] px-1.5 py-0.5 bg-dark-700 text-dark-300 rounded"
                >
                  {boardTypeLabels[type]}
                </span>
              ))}
              {boardTypes.length > 3 && (
                <span className="text-[10px] px-1.5 py-0.5 bg-dark-700 text-dark-300 rounded">
                  +{boardTypes.length - 3}
                </span>
              )}
            </div>

            <Progress value={0} size="sm" color="primary" animated={false} />
            <p className="text-xs text-dark-500 mt-1">0% выполнено</p>
          </Card>
        </Link>
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <PageHeader
        title="Папки"
        subtitle={`${folders.length} папок`}
        action={
          <Button onClick={() => openModal('createFolder')}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </Button>
        }
      />

      {/* Search */}
      <Input
        placeholder="Поиск папок..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        leftIcon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        }
      />

      {/* Folders Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 bg-dark-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AnimatePresence>
            {filteredFolders.map((folder) => (
              <FolderCard key={folder.id} folder={folder} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredFolders.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <p className="text-dark-400 mb-4">
            {searchQuery ? 'Папки не найдены' : 'У вас пока нет папок'}
          </p>
          {!searchQuery && (
            <Button onClick={() => openModal('createFolder')}>Создать папку</Button>
          )}
        </div>
      )}

    </motion.div>
  );
};

export default Folders;
