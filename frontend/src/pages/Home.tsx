import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { PageHeader } from '@/components/layout';
import { Card, CardContent, Progress, Badge, CircularProgress } from '@/components/ui';
import { TasksChart } from '@/components/charts';
import { useFoldersStore, useTasksStore, useAppStore } from '@/store';
import { cn, statusColors, formatDuration } from '@/utils';

const Home = () => {
  const { user } = useAppStore();
  const { folders, fetchFolders } = useFoldersStore();
  const { tasks, fetchTasks } = useTasksStore();

  useEffect(() => {
    fetchFolders();
    fetchTasks();
  }, [fetchFolders, fetchTasks]);

  const todayTasks = tasks.filter((t) => {
    if (!t.dueDate) return false;
    const today = new Date().toDateString();
    return new Date(t.dueDate).toDateString() === today;
  });

  const completedToday = todayTasks.filter((t) => t.status === 'completed').length;
  const totalToday = todayTasks.length;
  const todayProgress = totalToday > 0 ? (completedToday / totalToday) * 100 : 0;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;

  // Mock data for chart
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return {
      date: format(date, 'yyyy-MM-dd'),
      completed: Math.floor(Math.random() * 10),
      created: Math.floor(Math.random() * 8),
      timeSpent: Math.floor(Math.random() * 120),
    };
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <PageHeader
        title={`Привет, ${user?.firstName || 'User'}`}
        subtitle={format(new Date(), "EEEE, d MMMM", { locale: ru })}
      />

      {/* Today's Progress */}
      <motion.div variants={itemVariants}>
        <Card variant="gradient">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-dark-50 mb-1">Сегодня</h2>
              <p className="text-sm text-dark-400">
                {completedToday} из {totalToday} задач выполнено
              </p>
              {totalToday === 0 && (
                <p className="text-sm text-dark-500 mt-1">Нет задач на сегодня</p>
              )}
            </div>
            <CircularProgress
              value={todayProgress}
              size={80}
              strokeWidth={8}
              color={todayProgress >= 100 ? 'success' : 'primary'}
            >
              <span className="text-lg font-bold text-dark-50">
                {Math.round(todayProgress)}%
              </span>
            </CircularProgress>
          </div>
        </Card>
      </motion.div>

      {/* Quick Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
        <Card variant="bordered" padding="sm" className="text-center">
          <p className="text-2xl font-bold text-dark-50">{totalTasks}</p>
          <p className="text-xs text-dark-400">Всего задач</p>
        </Card>
        <Card variant="bordered" padding="sm" className="text-center">
          <p className="text-2xl font-bold text-green-400">{completedTasks}</p>
          <p className="text-xs text-dark-400">Выполнено</p>
        </Card>
        <Card variant="bordered" padding="sm" className="text-center">
          <p className="text-2xl font-bold text-primary-400">{inProgressTasks}</p>
          <p className="text-xs text-dark-400">В работе</p>
        </Card>
      </motion.div>

      {/* Activity Chart */}
      <motion.div variants={itemVariants}>
        <Card variant="bordered">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-dark-100">Активность</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="text-xs text-dark-400">Выполнено</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-500" />
                <span className="text-xs text-dark-400">Создано</span>
              </div>
            </div>
          </div>
          <TasksChart data={chartData} height={180} />
        </Card>
      </motion.div>

      {/* Today's Tasks */}
      {todayTasks.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-dark-100">Задачи на сегодня</h3>
            <Link to="/folders" className="text-sm text-primary-400">
              Все задачи
            </Link>
          </div>
          <div className="space-y-2">
            {todayTasks.slice(0, 5).map((task) => (
              <Card key={task.id} variant="bordered" padding="sm" interactive>
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                      task.status === 'completed'
                        ? 'bg-green-500 border-green-500'
                        : 'border-dark-500'
                    )}
                  >
                    {task.status === 'completed' && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        'text-sm font-medium truncate',
                        task.status === 'completed'
                          ? 'text-dark-400 line-through'
                          : 'text-dark-100'
                      )}
                    >
                      {task.title}
                    </p>
                  </div>
                  <Badge
                    size="sm"
                    variant={
                      task.status === 'completed'
                        ? 'success'
                        : task.status === 'in_progress'
                        ? 'primary'
                        : 'default'
                    }
                  >
                    {task.status === 'completed'
                      ? 'Готово'
                      : task.status === 'in_progress'
                      ? 'В работе'
                      : 'К выполнению'}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* Folders */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-dark-100">Папки</h3>
          <Link to="/folders" className="text-sm text-primary-400">
            Все папки
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {folders.slice(0, 4).map((folder) => {
            // Task counts not available in folder response
            const boardCount = folder.boards?.length || 0;

            return (
              <Link key={folder.id} to={`/folders/${folder.id}`}>
                <Card
                  variant="bordered"
                  interactive
                  className="h-full"
                  style={{ borderLeftColor: folder.color, borderLeftWidth: 3 }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-2xl">{folder.icon || '📁'}</span>
                    <span className="text-xs text-dark-400">
                      {boardCount} досок
                    </span>
                  </div>
                  <h4 className="font-medium text-dark-100 mb-2">{folder.name}</h4>
                  <Progress value={0} size="sm" color="primary" animated={false} />
                </Card>
              </Link>
            );
          })}
        </div>

        {folders.length === 0 && (
          <Card variant="bordered" className="text-center py-8">
            <p className="text-dark-400 mb-4">У вас пока нет папок</p>
            <Link
              to="/folders"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Создать папку
            </Link>
          </Card>
        )}
      </motion.div>
    </motion.div>
  );
};

export default Home;
