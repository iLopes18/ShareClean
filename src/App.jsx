import { useState, useEffect } from 'react';
import { db, auth } from './firebase'; // Importa do ficheiro acima
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import CleanApp from './CleanApp'; // A tua app antiga (ver passo 4)

export default function App() {
  const [user, setUser] = useState(null);
  const [houseId, setHouseId] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- LÓGICA DE INICIALIZAÇÃO ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Se user existe, ver se já tem casa
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists() && userSnap.data().houseId) {
          setHouseId(userSnap.data().houseId);
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // --- AÇÕES ---
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const createHouse = async () => {
    // Gera um código aleatório de 6 letras (Ex: AB12CD)
    const newHouseId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Cria a casa na BD
    await setDoc(doc(db, "houses", newHouseId), {
      owner: user.uid,
      createdAt: new Date(),
      users: [{ 
        uid: user.uid, 
        name: user.displayName, 
        email: user.email,
        slotIndex: 0 // O criador fica com o primeiro "boneco/quarto"
      }],
      // Aqui vamos pôr os teus dados default depois
      zones: {}, 
      history: {}
    });

    // Atualiza o User
    await setDoc(doc(db, "users", user.uid), {
      email: user.email,
      houseId: newHouseId
    }, { merge: true });

    setHouseId(newHouseId);
  };

  const joinHouse = async (inputCode) => {
    const code = inputCode.trim().toUpperCase();
    const houseRef = doc(db, "houses", code);
    const houseSnap = await getDoc(houseRef);

    if (houseSnap.exists()) {
      const houseData = houseSnap.data();
      // Adiciona o user à lista da casa
      const newUsersList = [...houseData.users, {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        slotIndex: houseData.users.length // Pega a próxima vaga
      }];

      await updateDoc(houseRef, { users: newUsersList });
      
      // Guarda no perfil do user
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        houseId: code
      }, { merge: true });

      setHouseId(code);
    } else {
      alert("Código de casa não encontrado!");
    }
  };

  // --- INTERFACE ---

  if (loading) return <div className="p-10 text-center">A carregar ShareClean...</div>;

  // 1. Ecrã de Login
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-teal-50">
        <h1 className="text-4xl font-bold text-teal-700 mb-4">ShareClean ✨</h1>
        <button onClick={handleLogin} className="bg-white px-6 py-3 rounded-xl shadow font-bold flex items-center gap-2 hover:bg-gray-50">
           Entrar com Google
        </button>
      </div>
    );
  }

  // 2. Ecrã "Criar ou Juntar" (Só aparece se user não tiver casa)
  if (!houseId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 space-y-6 p-4">
        <h2 className="text-xl font-bold">Olá, {user.displayName}!</h2>
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <button 
            onClick={createHouse}
            className="bg-teal-600 text-white p-6 rounded-xl font-bold shadow-lg hover:bg-teal-700"
          >
            🏠 Criar uma Nova Casa
          </button>
          
          <div className="bg-white p-6 rounded-xl shadow border text-center">
            <p className="mb-2 font-semibold text-slate-600">Já tens um código?</p>
            <form onSubmit={(e) => { e.preventDefault(); joinHouse(e.target.code.value); }}>
              <input name="code" placeholder="Ex: XKY98Z" className="border p-2 rounded w-full text-center uppercase mb-2" />
              <button type="submit" className="bg-slate-200 w-full py-2 rounded font-bold hover:bg-slate-300">Entrar</button>
            </form>
          </div>
        </div>
        <button onClick={() => signOut(auth)} className="text-red-400 text-sm">Sair da conta</button>
      </div>
    );
  }

  // 3. A App Real (Quando já tens casa)
  return (
    <CleanApp 
      houseId={houseId} 
      currentUser={user} 
      onLogout={() => { signOut(auth); setHouseId(null); }} 
    />
  );
}