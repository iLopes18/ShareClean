import { useState, useEffect, cloneElement } from 'react';
import { 
  CheckCircle, Calendar, Settings, ArrowLeft, Utensils, Sofa, Footprints,
  Droplets, Bubbles, Sparkles, Info, Sun, Moon, Plus, Trash2,
  Clock, ChevronLeft, ChevronRight, RotateCcw, Download, Share, MoreVertical, X, LogOut
} from 'lucide-react';

import { doc, onSnapshot, updateDoc, setDoc } from "firebase/firestore";
import { db } from './firebase'; // Importa a configuração que já criaste

// --- DADOS PADRÃO (Para inicializar novas casas) ---
const ZONE_ICONS = {
  kitchen: <Utensils className="w-6 h-6" />,
  living: <Sofa className="w-6 h-6" />,
  corridor: <Footprints className="w-6 h-6" />,
  wc_up: <Droplets className="w-6 h-6" />,
  wc_down: <Bubbles className="w-6 h-6" />
};

const DEFAULT_DATA = {
  users: [
    { id: 0, name: 'Quarto 1', floor: 'up', colorClass: 'bg-indigo-100 text-indigo-600' },
    { id: 1, name: 'Quarto 2', floor: 'up', colorClass: 'bg-blue-100 text-blue-600' },
    { id: 2, name: 'Quarto 3', floor: 'down', colorClass: 'bg-orange-100 text-orange-600' },
    { id: 3, name: 'Quarto 4', floor: 'down', colorClass: 'bg-amber-100 text-amber-600' },
    { id: 4, name: 'Quarto 5', floor: 'down', colorClass: 'bg-yellow-100 text-yellow-600' },
  ],
  zones: {
    kitchen: { id: 'kitchen', label: 'Cozinha', tasks: ['Lavar loiça acumulada', 'Limpar balcões e fogão', 'Varrer e lavar chão', 'Tirar o lixo'] },
    living: { id: 'living', label: 'Sala', tasks: ['Aspirar tapetes e sofás', 'Limpar pó das mesas/tv', 'Arrumar objetos perdidos', 'Arejar o espaço'] },
    corridor: { id: 'corridor', label: 'Corredores', tasks: ['Varrer escadas', 'Lavar chão dos corredores', 'Limpar entrada', 'Verificar lâmpadas'] },
    wc_up: { id: 'wc_up', label: 'WC Superior', tasks: ['Lavar sanita e lavatório', 'Limpar espelho', 'Esfregar base de duche', 'Repor papel higiénico'] },
    wc_down: { id: 'wc_down', label: 'WC Inferior', tasks: ['Lavar sanita e lavatório', 'Limpar espelho', 'Lavar chão', 'Tirar lixo do WC'] },
  },
  history: {}
};

const ORDERED_ZONE_KEYS = ['wc_up', 'wc_down', 'kitchen', 'living', 'corridor'];
const ROTATION_MATRIX = [
  [1, 3, 2, 4, 0], [0, 2, 4, 3, 1], [1, 4, 3, 0, 2], [2, 3, 0, 1, 4], [0, 4, 1, 2, 3]  
];

const COLOR_PALETTE = [
  { label: 'Indigo', class: 'bg-indigo-100 text-indigo-600 ring-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:ring-indigo-800' },
  { label: 'Blue', class: 'bg-blue-100 text-blue-600 ring-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:ring-blue-800' },
  { label: 'Cyan', class: 'bg-cyan-100 text-cyan-600 ring-cyan-200 dark:bg-cyan-900/50 dark:text-cyan-300 dark:ring-cyan-800' },
  { label: 'Teal', class: 'bg-teal-100 text-teal-600 ring-teal-200 dark:bg-teal-900/50 dark:text-teal-300 dark:ring-teal-800' },
  { label: 'Green', class: 'bg-green-100 text-green-600 ring-green-200 dark:bg-green-900/50 dark:text-green-300 dark:ring-green-800' },
  { label: 'Lime', class: 'bg-lime-100 text-lime-600 ring-lime-200 dark:bg-lime-900/50 dark:text-lime-300 dark:ring-lime-800' },
  { label: 'Yellow', class: 'bg-yellow-100 text-yellow-600 ring-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:ring-yellow-800' },
  { label: 'Amber', class: 'bg-amber-100 text-amber-600 ring-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:ring-amber-800' },
  { label: 'Orange', class: 'bg-orange-100 text-orange-600 ring-orange-200 dark:bg-orange-900/50 dark:text-orange-300 dark:ring-orange-800' },
  { label: 'Red', class: 'bg-red-100 text-red-600 ring-red-200 dark:bg-red-900/50 dark:text-red-300 dark:ring-red-800' },
  { label: 'Pink', class: 'bg-pink-100 text-pink-600 ring-pink-200 dark:bg-pink-900/50 dark:text-pink-300 dark:ring-pink-800' },
  { label: 'Purple', class: 'bg-purple-100 text-purple-600 ring-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:ring-purple-800' },
  { label: 'Slate', class: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700' },
];

// --- HELPERS ---
const getWeekNumber = (d) => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

const getRelativeWeekID = (offset) => {
  const now = new Date();
  now.setDate(now.getDate() + (offset * 7));
  return `${now.getFullYear()}-W${getWeekNumber(now)}`;
};

const getWeekRange = (weekOffset = 0) => {
  const now = new Date();
  now.setDate(now.getDate() + (weekOffset * 7));
  const day = now.getDay(); 
  const diff = day === 0 ? -6 : 1 - day; 
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const format = (d) => `${d.getDate()}/${d.getMonth() + 1}`;
  return `${format(monday)} a ${format(sunday)}`;
};

const getAssignmentForWeek = (weekOffset, userIndex, zones) => {
  const currentWeekNum = getWeekNumber(new Date()) + weekOffset;
  const cycleIndex = ((currentWeekNum % 5) + 5) % 5;
  const weekAssignments = ROTATION_MATRIX[cycleIndex];
  const zoneIndex = weekAssignments.indexOf(userIndex);
  
  if (zoneIndex !== -1 && ORDERED_ZONE_KEYS[zoneIndex]) {
    const zoneKey = ORDERED_ZONE_KEYS[zoneIndex];
    return { ...zones[zoneKey], icon: ZONE_ICONS[zoneKey] || <Info /> };
  }
  return { ...zones.kitchen, icon: ZONE_ICONS.kitchen }; 
};

// --- COMPONENTES UI ---
const ProgressBar = ({ progress, className = "" }) => (
  <div className={`w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 shadow-inner ${className}`}>
    <div className="bg-teal-500 h-2 rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
  </div>
);

const Card = ({ children, className = "", onClick, isDarkMode }) => (
  <div onClick={onClick} className={`rounded-2xl shadow-sm border p-4 transition-all hover:shadow-md ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} ${onClick ? 'cursor-pointer active:scale-95' : ''} ${className}`}>
    {children}
  </div>
);

const UserAvatar = ({ user, size = "md", className = "" }) => {
  const sizeClasses = { sm: "w-6 h-6 text-[10px]", md: "w-12 h-12 text-lg", lg: "w-16 h-16 text-2xl" };
  const colorClass = user.colorClass || 'bg-slate-100 text-slate-600';
  return (
    <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold flex-shrink-0 ${colorClass} ${className}`}>
      {user.name.charAt(0)}
    </div>
  );
};

// --- VIEWS ---

const HomeView = ({ users, zones, currentWeekStatus, setView, setSelectedUser, totalProgress, isDarkMode, toggleTheme, weekOffset, setWeekOffset, houseId }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>ShareClean</h1>
          <div className="flex items-center gap-2 mt-1">
             <div className={`flex items-center gap-2 text-sm font-medium p-1 rounded-lg w-fit ${isDarkMode ? 'bg-slate-900 text-slate-300' : 'bg-white text-slate-600 border border-slate-200'}`}>
              <button onClick={() => setWeekOffset(prev => prev - 1)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded"><ChevronLeft className="w-4 h-4" /></button>
              <span className="min-w-[100px] text-center">{getWeekRange(weekOffset)}</span>
              <button onClick={() => setWeekOffset(prev => prev + 1)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded"><ChevronRight className="w-4 h-4" /></button>
            </div>
            {weekOffset !== 0 && (
              <button onClick={() => setWeekOffset(0)} className="p-1.5 rounded-lg bg-teal-50 text-teal-600"><RotateCcw className="w-4 h-4" /></button>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={toggleTheme} className={`p-2 rounded-full ${isDarkMode ? 'bg-slate-800 text-yellow-400' : 'bg-slate-100 text-slate-600'}`}>
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button onClick={() => setView('house')} className={`p-2 rounded-full ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Código da Casa para partilhar */}
      <div className={`p-3 rounded-xl border border-dashed flex justify-between items-center ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-blue-50 border-blue-200'}`}>
         <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400">Código da Casa</span>
            <span className="text-xl font-mono font-bold tracking-widest text-blue-500">{houseId}</span>
         </div>
         <Share className="w-5 h-5 text-blue-400" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {users.map((user) => {
          const isDone = currentWeekStatus[user.id];
          const zone = getAssignmentForWeek(weekOffset, user.id, zones);
          return (
            <Card key={user.id} isDarkMode={isDarkMode} onClick={() => { setSelectedUser(user); setView('profile'); }}
              className={`relative overflow-hidden ${isDone ? (isDarkMode ? 'ring-2 ring-green-500/50 bg-green-900/20' : 'ring-2 ring-green-400 bg-green-50') : ''}`}>
              <div className="flex flex-col items-center text-center space-y-2">
                <UserAvatar user={user} size="md" />
                <div className="w-full">
                  <h3 className={`font-medium text-sm truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{user.name}</h3>
                  <div className={`flex items-center justify-center gap-1 text-xs mt-1 mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {zone.icon} <span className="truncate max-w-[80px]">{zone.label}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <ProgressBar progress={isDone ? 100 : 0} />
                    <span className={isDone ? 'text-green-500 font-bold' : 'text-slate-400'}>{isDone ? '100%' : '0%'}</span>
                  </div>
                </div>
                {isDone && <div className="absolute top-2 right-2 text-green-500"><CheckCircle className="w-5 h-5" /></div>}
              </div>
            </Card>
          );
        })}
        <Card isDarkMode={isDarkMode} onClick={() => setView('calendar')} className={`flex flex-col items-center justify-center gap-3 text-center border-dashed ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <div className={`p-3 rounded-full ${isDarkMode ? 'bg-slate-800 text-teal-400' : 'bg-white text-teal-600 shadow-sm'}`}><Calendar className="w-6 h-6" /></div>
          <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>Calendário</span>
        </Card>
      </div>

      <Card isDarkMode={isDarkMode} className={isDarkMode ? '!bg-slate-900 border-teal-900/30' : '!bg-white border-teal-100'}>
        <div className="flex justify-between items-center mb-2">
          <span className={`font-semibold ${isDarkMode ? 'text-teal-400' : 'text-teal-800'}`}>Progresso Semanal</span>
          <span className={`text-sm font-bold ${isDarkMode ? 'text-teal-400' : 'text-teal-600'}`}>{Math.round(totalProgress)}%</span>
        </div>
        <ProgressBar progress={totalProgress} className="h-4" />
      </Card>
    </div>
  );
};

const ProfileView = ({ user, zones, currentWeekStatus, onBack, onToggleTaskCompletion, isDarkMode, weekOffset }) => {
  const currentZone = getAssignmentForWeek(weekOffset, user.id, zones);
  const isCompleted = currentWeekStatus[user.id] || false;
  const [tasks, setTasks] = useState(currentZone.tasks.map(t => ({ text: t, done: isCompleted })));

  useEffect(() => {
    const allDone = tasks.every(t => t.done);
    if (allDone !== isCompleted) onToggleTaskCompletion(user.id, allDone);
  }, [tasks, isCompleted, onToggleTaskCompletion, user.id]);

  const handleTaskToggle = (idx) => {
    const newTasks = [...tasks];
    newTasks[idx].done = !newTasks[idx].done;
    setTasks(newTasks);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300 pb-20">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}><ArrowLeft className="w-6 h-6" /></button>
        <UserAvatar user={user} size="lg" />
        <div>
          <h2 className={`text-xl font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{user.name}</h2>
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{getWeekRange(weekOffset)}</p>
        </div>
      </div>

      <Card isDarkMode={isDarkMode} className={`border-none relative overflow-hidden ${isDarkMode ? '!bg-slate-800 text-white' : '!bg-gradient-to-br !from-teal-500 !to-teal-600 text-white'}`}>
        <div className="relative z-10">
          <p className="text-sm mb-1 opacity-90">Missão da semana:</p>
          <h3 className="text-2xl font-bold flex items-center gap-2">{currentZone.icon} {currentZone.label}</h3>
        </div>
        <Sparkles className="absolute -bottom-10 -right-10 w-40 h-40 opacity-10" />
      </Card>

      <div className="space-y-3">
        {tasks.map((task, idx) => (
          <div key={idx} onClick={() => handleTaskToggle(idx)} className={`flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer ${task.done ? (isDarkMode ? 'bg-green-900/20 border-green-900/50' : 'bg-green-50 border-green-200') : (isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100')}`}>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${task.done ? 'bg-green-500 border-green-500' : 'border-slate-300'}`}>{task.done && <CheckCircle className="w-4 h-4 text-white" />}</div>
            <span className={`text-sm ${task.done ? 'line-through opacity-50' : ''}`}>{task.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const HouseView = ({ users, zones, onBack, onUpdateData, isDarkMode, onLogout }) => {
  const [expandedUser, setExpandedUser] = useState(null);
  const [expandedZone, setExpandedZone] = useState(null);
  const [newTaskInput, setNewTaskInput] = useState("");

  const handleAddTask = (zoneId) => {
    if (!newTaskInput.trim()) return;
    const updatedZone = { ...zones[zoneId], tasks: [...zones[zoneId].tasks, newTaskInput] };
    onUpdateData({ zones: { ...zones, [zoneId]: updatedZone } });
    setNewTaskInput("");
  };

  const handleRemoveTask = (zoneId, taskIndex) => {
    const newTasks = zones[zoneId].tasks.filter((_, idx) => idx !== taskIndex);
    const updatedZone = { ...zones[zoneId], tasks: newTasks };
    onUpdateData({ zones: { ...zones, [zoneId]: updatedZone } });
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300 pb-20">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}><ArrowLeft className="w-6 h-6" /></button>
          <h2 className={`text-xl font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Definições</h2>
        </div>
        <button onClick={onLogout} className="text-red-500 text-xs font-bold flex items-center gap-1 bg-red-50 px-3 py-2 rounded-full hover:bg-red-100"><LogOut size={14}/> Sair</button>
      </div>

      <section>
        <h3 className="font-bold mb-3 opacity-70">Habitantes</h3>
        <div className={`rounded-2xl border divide-y ${isDarkMode ? 'bg-slate-900 border-slate-800 divide-slate-800' : 'bg-white border-slate-100 divide-slate-50'}`}>
          {users.map(u => (
            <div key={u.id} className="p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <UserAvatar user={u} size="md" />
                  <div>
                    <input type="text" value={u.name} onChange={(e) => {
                       const newUsers = users.map(user => user.id === u.id ? { ...user, name: e.target.value } : user);
                       onUpdateData({ users: newUsers });
                    }} className="bg-transparent font-medium w-32 focus:outline-none" />
                  </div>
                </div>
                <button onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)} className="text-xs bg-slate-100 px-3 py-1 rounded-full text-slate-600 font-bold">Cor</button>
              </div>
              {expandedUser === u.id && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {COLOR_PALETTE.map((color, idx) => (
                    <button key={idx} onClick={() => {
                      const newUsers = users.map(user => user.id === u.id ? { ...user, colorClass: color.class } : user);
                      onUpdateData({ users: newUsers });
                    }} className={`w-8 h-8 rounded-full border-2 ${color.class} ${u.colorClass === color.class ? 'ring-2 ring-offset-2' : 'border-transparent'}`} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
      
      <section>
        <h3 className="font-bold mb-3 opacity-70">Tarefas por Divisão</h3>
        <div className={`rounded-2xl border divide-y ${isDarkMode ? 'bg-slate-900 border-slate-800 divide-slate-800' : 'bg-white border-slate-100 divide-slate-50'}`}>
          {Object.values(zones).map(zone => (
            <div key={zone.id} className="p-4">
               <div className="flex justify-between items-center">
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">{ZONE_ICONS[zone.id] || <Info />}</div>
                   <span className="font-medium">{zone.label}</span>
                 </div>
                 <button onClick={() => setExpandedZone(expandedZone === zone.id ? null : zone.id)} className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-bold">Tarefas</button>
               </div>
               {expandedZone === zone.id && (
                 <div className="mt-4 space-y-2 pl-4">
                   {zone.tasks.map((task, idx) => (
                     <div key={idx} className="flex justify-between text-sm items-center border p-2 rounded bg-slate-50/50">
                       <span>{task}</span>
                       <button onClick={() => handleRemoveTask(zone.id, idx)} className="text-red-400"><Trash2 size={14}/></button>
                     </div>
                   ))}
                   <div className="flex gap-2 mt-2">
                     <input value={newTaskInput} onChange={e => setNewTaskInput(e.target.value)} placeholder="Nova tarefa..." className="flex-1 text-sm p-2 border rounded" />
                     <button onClick={() => handleAddTask(zone.id)} className="bg-teal-500 text-white p-2 rounded"><Plus size={16}/></button>
                   </div>
                 </div>
               )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

// --- APP PRINCIPAL (CONTROLLER) ---

export default function CleanApp({ houseId, currentUser, onLogout }) {
  const [data, setData] = useState(null);
  const [view, setView] = useState('home');
  const [selectedUser, setSelectedUser] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Efeito do Tema
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) { root.classList.add('dark'); document.body.classList.add('bg-slate-950'); }
    else { root.classList.remove('dark'); document.body.classList.remove('bg-slate-950'); }
  }, [isDarkMode]);

  // Listener do Firestore (Ligado à casa específica)
  useEffect(() => {
    if (!houseId) return;
    const houseRef = doc(db, "houses", houseId);
    
    const unsubscribe = onSnapshot(houseRef, (docSnap) => {
      if (docSnap.exists()) {
        const houseData = docSnap.data();
        
        // Se a casa estiver "vazia" de dados de jogo (apenas tem info de criação), 
        // injeta os dados default para não dar erro.
        if (!houseData.zones || !houseData.users || houseData.users.length <= 1) {
            updateDoc(houseRef, { 
                zones: DEFAULT_DATA.zones, 
                users: DEFAULT_DATA.users, // Substitui os users iniciais pelos quartos default
                history: {} 
            });
        } else {
            setData(houseData);
        }
      }
    });
    return () => unsubscribe();
  }, [houseId]);

  const updateData = async (newDataPart) => {
    if (!houseId) return;
    await updateDoc(doc(db, "houses", houseId), newDataPart);
  };

  const toggleTaskCompletion = (userId, allTasksCompleted) => {
    const viewedWeekID = getRelativeWeekID(weekOffset);
    const newHistory = { 
      ...data.history,
      [viewedWeekID]: { ...(data.history[viewedWeekID] || {}), [userId]: allTasksCompleted }
    };
    updateData({ history: newHistory });
  };

  if (!data) return <div className="min-h-screen flex items-center justify-center text-slate-400 animate-pulse">A sincronizar casa...</div>;

  const currentWeekStatus = data.history[getRelativeWeekID(weekOffset)] || {};
  const completedCount = Object.values(currentWeekStatus).filter(Boolean).length;
  const totalProgress = (completedCount / 5) * 100;

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <div className={`max-w-md mx-auto min-h-screen shadow-2xl overflow-hidden flex flex-col ${isDarkMode ? 'bg-slate-950' : 'bg-white'}`}>
        <main className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          {view === 'home' && (
            <HomeView users={data.users} zones={data.zones} currentWeekStatus={currentWeekStatus}
              setView={setView} setSelectedUser={setSelectedUser} totalProgress={totalProgress}
              isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)}
              weekOffset={weekOffset} setWeekOffset={setWeekOffset} houseId={houseId} />
          )}
          
          {view === 'profile' && selectedUser && (
            <ProfileView user={selectedUser} zones={data.zones} currentWeekStatus={currentWeekStatus}
              onBack={() => setView('home')} onToggleTaskCompletion={toggleTaskCompletion}
              isDarkMode={isDarkMode} weekOffset={weekOffset} />
          )}

          {view === 'house' && (
            <HouseView users={data.users} zones={data.zones} onBack={() => setView('home')}
              onUpdateData={updateData} isDarkMode={isDarkMode} onLogout={onLogout} />
          )}

          {/* Calendário foi simplificado na home, mas se quiseres a view completa podes reativar aqui */}
          {view === 'calendar' && (
             <div className="p-4 text-center">
                <button onClick={() => setView('home')} className="mb-4 text-teal-600 font-bold">Voltar</button>
                <p>Calendário detalhado em construção...</p>
             </div>
          )}
        </main>
      </div>
    </div>
  );
}