import React, { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from './firebaseConfig';

// ============================================================================
// LOGO EMBEDDED IN BASE64
// ============================================================================
const LOGO_BASE64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/..."; // [Mantieni il logo originale dal tuo file]

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tasks, setTasks] = useState([]);
  const [teamName, setTeamName] = useState('');
  const [team, setTeam] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [userList, setUserList] = useState([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState('all');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');

  // ========================================================================
  // AUTHENTICATION
  // ========================================================================

  // Monitor auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setIsAuthenticated(true);
        setError('');
        // Fetch user data from Firestore
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const unsubscribeUser = onSnapshot(userDocRef, (userDoc) => {
            if (userDoc.exists()) {
              setCurrentUser({
                ...user,
                username: userDoc.data().username || user.email
              });
            }
          });
          return unsubscribeUser;
        } catch (err) {
          console.error('Error fetching user data:', err);
        }
      } else {
        setCurrentUser(null);
        setIsAuthenticated(false);
        setTeam(null);
        setTasks([]);
      }
    });
    return unsubscribe;
  }, []);

  // Fetch tasks for current user
  useEffect(() => {
    if (!currentUser || !team) return;

    const tasksQuery = query(
      collection(db, `teams/${team.id}/tasks`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
      const taskList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setTasks(taskList);
    });

    return unsubscribe;
  }, [currentUser, team]);

  // Fetch team members
  useEffect(() => {
    if (!team) return;

    const membersQuery = query(collection(db, `teams/${team.id}/members`));
    const unsubscribe = onSnapshot(membersQuery, async (snapshot) => {
      const members = [];
      for (const doc of snapshot.docs) {
        const memberData = doc.data();
        try {
          const userDocRef = doc(db, 'users', memberData.userId);
          const userDoc = await onSnapshot(userDocRef, (userSnap) => {
            if (userSnap.exists()) {
              members.push({
                id: doc.id,
                username: userSnap.data().username || userSnap.data().email,
                ...memberData
              });
            }
          });
        } catch (error) {
          console.error('Error fetching member:', error);
        }
      }
      setTeamMembers(members);
    });

    return unsubscribe;
  }, [team]);

  // Register handler
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password || !username) {
      setError('Compila tutti i campi');
      return;
    }

    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // 2. ✅ SAVE USER DATA TO FIRESTORE (THIS WAS MISSING!)
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        username: username,
        email: email,
        createdAt: serverTimestamp(),
        avatar: null
      });

      setSuccess('Registrazione completata! Accedi adesso.');
      setShowRegister(false);
      setEmail('');
      setPassword('');
      setUsername('');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Email già registrata');
      } else if (err.code === 'auth/weak-password') {
        setError('Password troppo debole (minimo 6 caratteri)');
      } else {
        setError('Errore nella registrazione: ' + err.message);
      }
    }
  };

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Inserisci email e password');
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setEmail('');
      setPassword('');
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        setError('Utente non trovato');
      } else if (err.code === 'auth/wrong-password') {
        setError('Password errata');
      } else {
        setError('Errore nel login: ' + err.message);
      }
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setTeam(null);
      setTasks([]);
    } catch (err) {
      setError('Errore nel logout: ' + err.message);
    }
  };

  // ========================================================================
  // TEAM MANAGEMENT
  // ========================================================================

  // Create team
  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!teamName) {
      setError('Inserisci il nome del team');
      return;
    }

    try {
      const teamRef = await addDoc(collection(db, 'teams'), {
        name: teamName,
        ownerId: currentUser.uid,
        ownerEmail: currentUser.email,
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, `teams/${teamRef.id}/members`), {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        role: 'owner',
        joinedAt: serverTimestamp()
      });

      setTeam({ id: teamRef.id, name: teamName });
      setTeamName('');
      setSuccess('Team creato con successo!');
    } catch (err) {
      setError('Errore nella creazione del team: ' + err.message);
    }
  };

  // Add member to team
  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!selectedUser || selectedUser === 'all') {
      setError('Seleziona un utente');
      return;
    }

    try {
      const selectedUserData = userList.find((u) => u.id === selectedUser);
      if (!selectedUserData) {
        setError('Utente non trovato');
        return;
      }

      await addDoc(collection(db, `teams/${team.id}/members`), {
        userId: selectedUserData.id,
        userEmail: selectedUserData.email,
        role: 'member',
        joinedAt: serverTimestamp()
      });

      setSuccess('Utente aggiunto al team!');
      setSelectedUser('all');
    } catch (err) {
      setError('Errore nell\'aggiunta dell\'utente: ' + err.message);
    }
  };

  // Fetch all users
  useEffect(() => {
    const usersQuery = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const users = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter((u) => u.id !== currentUser?.uid);
      setUserList(users);
    });
    return unsubscribe;
  }, [currentUser]);

  // ========================================================================
  // TASK MANAGEMENT
  // ========================================================================

  // Handle image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const reader = new FileReader();
        reader.onloadend = () => {
          setUploadedImage({
            file: file,
            preview: reader.result
          });
        };
        reader.readAsDataURL(file);
      } catch (err) {
        setError('Errore nel caricamento dell\'immagine: ' + err.message);
      }
    }
  };

  // Add task
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!taskTitle) {
      setError('Inserisci il titolo del task');
      return;
    }

    try {
      let imageUrl = null;
      if (uploadedImage?.file) {
        const imagePath = `tasks/${Date.now()}_${uploadedImage.file.name}`;
        const imageRef = ref(storage, imagePath);
        await uploadBytes(imageRef, uploadedImage.file);
        imageUrl = await getDownloadURL(imageRef);
      }

      await addDoc(collection(db, `teams/${team.id}/tasks`), {
        title: taskTitle,
        description: taskDescription,
        deadline: taskDeadline || null,
        priority: taskPriority,
        assignedTo: currentUser.uid,
        assignedToEmail: currentUser.email,
        status: 'pending',
        imageUrl: imageUrl,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp()
      });

      setSuccess('Task creato con successo!');
      setTaskTitle('');
      setTaskDescription('');
      setTaskDeadline('');
      setTaskPriority('Medium');
      setUploadedImage(null);
      setShowTaskForm(false);
    } catch (err) {
      setError('Errore nella creazione del task: ' + err.message);
    }
  };

  // Update task status
  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      await updateDoc(doc(db, `teams/${team.id}/tasks`, taskId), {
        status: newStatus
      });
      setSuccess('Task aggiornato!');
    } catch (err) {
      setError('Errore nell\'aggiornamento del task: ' + err.message);
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo task?')) return;

    try {
      await deleteDoc(doc(db, `teams/${team.id}/tasks`, taskId));
      setSuccess('Task eliminato!');
    } catch (err) {
      setError('Errore nell\'eliminazione del task: ' + err.message);
    }
  };

  // Filter tasks
  const filteredTasks = selectedUser === 'all' 
    ? tasks 
    : tasks.filter((task) => task.assignedTo === selectedUser);

  // ========================================================================
  // RENDER
  // ========================================================================

  // Auth page
  if (!isAuthenticated) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <img src={LOGO_BASE64} alt="Logo" />
          </div>
          <p>{showRegister ? 'Registrati' : 'Accedi'}</p>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <form onSubmit={showRegister ? handleRegister : handleLogin}>
            {showRegister && (
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Inserisci il tuo username"
                />
              </div>
            )}
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Inserisci la tua email"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Inserisci la password"
              />
            </div>
            <button type="submit" className="btn">
              {showRegister ? 'Registrati' : 'Accedi'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowRegister(!showRegister);
                setError('');
                setSuccess('');
              }}
            >
              {showRegister ? 'Ho un account, accedi' : 'Non ho un account, registrati'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard
  if (!team) {
    return (
      <div className="app-container">
        <div className="header">
          <div className="header-logo">
            <img src={LOGO_BASE64} alt="Logo" style={{ height: '80px' }} />
          </div>
          <div className="header-right">
            <div className="user-email">
              Ciao, {currentUser?.username || currentUser?.email}
            </div>
            <button className="btn btn-small" onClick={handleLogout}>
              Esci
            </button>
          </div>
        </div>

        <div className="dashboard">
          <h1>I miei team</h1>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div style={{ marginTop: '30px' }}>
            <h2>Crea un nuovo team</h2>
            <form onSubmit={handleCreateTeam} style={{ maxWidth: '500px' }}>
              <div className="form-group">
                <label>Nome del team</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Inserisci il nome del team"
                />
              </div>
              <button type="submit" className="btn">
                Crea team
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Task management
  return (
    <div className="app-container">
      <div className="header">
        <div className="header-logo">
          <img src={LOGO_BASE64} alt="Logo" style={{ height: '80px' }} />
        </div>
        <div>
          <h2>{team.name}</h2>
        </div>
        <div className="header-right">
          <div className="user-email">
            {currentUser?.username || currentUser?.email}
          </div>
          <button className="btn btn-small" onClick={handleLogout}>
            Esci
          </button>
        </div>
      </div>

      <div className="dashboard">
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {/* Add Task */}
        <div className="add-task-container">
          <button
            className={`add-task-btn ${showTaskForm ? 'open' : ''}`}
            onClick={() => setShowTaskForm(!showTaskForm)}
          >
            +
          </button>
        </div>

        {showTaskForm && (
          <form onSubmit={handleAddTask} className="task-form">
            <h2>Nuovo Task</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Titolo</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Titolo del task"
                />
              </div>
              <div className="form-group">
                <label>Priorità</label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>
              <div className="form-group">
                <label>Scadenza</label>
                <input
                  type="date"
                  value={taskDeadline}
                  onChange={(e) => setTaskDeadline(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Descrizione</label>
              <textarea
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Descrizione del task"
                rows="4"
              />
            </div>
            <div className="form-group">
              <label>Immagine (opzionale)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
              />
              {uploadedImage?.preview && (
                <img
                  src={uploadedImage.preview}
                  alt="Preview"
                  className="image-preview-upload"
                />
              )}
            </div>
            <button type="submit" className="btn">
              Crea Task
            </button>
          </form>
        )}

        {/* Add Member */}
        <form onSubmit={handleAddUser} style={{ marginBottom: '30px', maxWidth: '400px' }}>
          <div className="form-group">
            <label>Aggiungi membro al team</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
            >
              <option value="all">Seleziona un utente</option>
              {userList.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username || user.email}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn">
            Aggiungi al team
          </button>
        </form>

        {/* Filters */}
        <div className="filters">
          <button
            className={`filter-btn ${selectedUser === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedUser('all')}
          >
            Tutti
          </button>
          {teamMembers.map((member) => (
            <button
              key={member.id}
              className={`filter-btn ${
                selectedUser === member.userId ? 'active' : ''
              }`}
              onClick={() => setSelectedUser(member.userId)}
            >
              {member.username || member.userEmail}
            </button>
          ))}
        </div>

        {/* Statistics */}
        <div className="statistics">
          <div className="stat-card">
            <h3>{filteredTasks.length}</h3>
            <p>Task totali</p>
          </div>
          <div className="stat-card">
            <h3>{filteredTasks.filter((t) => t.status === 'pending').length}</h3>
            <p>In sospeso</p>
          </div>
          <div className="stat-card">
            <h3>{filteredTasks.filter((t) => t.status === 'completed').length}</h3>
            <p>Completati</p>
          </div>
        </div>

        {/* Task List */}
        <div className="task-list">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`task-card ${
                task.status === 'completed' ? 'completed' : ''
              }`}
            >
              <input
                type="checkbox"
                className="task-checkbox"
                checked={task.status === 'completed'}
                onChange={(e) =>
                  handleUpdateTaskStatus(
                    task.id,
                    e.target.checked ? 'completed' : 'pending'
                  )
                }
              />
              {task.imageUrl && (
                <img src={task.imageUrl} alt="Task" className="task-image-preview" />
              )}
              <div className="task-content">
                <div className="task-header">
                  <div>
                    <div className="task-title">{task.title}</div>
                    <div className="task-description">{task.description}</div>
                  </div>
                  <button
                    className="btn btn-small btn-danger"
                    onClick={() => handleDeleteTask(task.id)}
                  >
                    Elimina
                  </button>
                </div>
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#999' }}>
                  {task.deadline && <span>Scadenza: {task.deadline} | </span>}
                  <span>Priorità: {task.priority}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredTasks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <p>Nessun task trovato</p>
          </div>
        )}
      </div>

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; background: #f5f5f5; color: #333; }
        .app-container { min-height: 100vh; display: flex; flex-direction: column; }
        .auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #007BFF 0%, #0056b3 100%); padding: 20px; }
        .auth-card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); width: 100%; max-width: 600px; }
        .auth-logo { display: flex; justify-content: center; margin-bottom: 10px; }
        .auth-logo img { height: 300px; width: auto; max-width: 100%; }
        .auth-card p { text-align: center; color: #666; margin-bottom: 30px; font-size: 26px; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 8px; color: #333; font-weight: 500; }
        .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: #007BFF; }
        .btn { width: 100%; padding: 14px; background: #007BFF; color: white; border: none; border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer; }
        .btn:hover { background: #0056b3; }
        .btn-secondary { background: #6c757d; }
        .btn-secondary:hover { background: #5a6268; }
        .btn-danger { background: #dc3545; }
        .btn-danger:hover { background: #c82333; }
        .btn-small { padding: 8px 16px; font-size: 14px; width: auto; }
        .error-message { background: #fff3cd; color: #856404; padding: 12px; border-radius: 6px; margin-bottom: 20px; border: 1px solid #ffeaa7; }
        .success-message { background: #d4edda; color: #155724; padding: 12px; border-radius: 6px; margin-bottom: 20px; border: 1px solid #c3e6cb; }
        .header { background: white; padding: 30px 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center; }
        .header-logo img { height: 120px; width: auto; }
        .header-right { display: flex; gap: 15px; align-items: center; }
        .dashboard { flex: 1; padding: 30px; max-width: 1400px; margin: 0 auto; width: 100%; }
        .statistics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); text-align: center; }
        .stat-card h3 { font-size: 32px; color: #007BFF; margin-bottom: 5px; }
        .filters { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
        .filter-btn { padding: 10px 20px; background: white; border: 2px solid #ddd; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; }
        .filter-btn.active { background: #007BFF; color: white; border-color: #007BFF; }
        .add-task-container { margin-bottom: 30px; }
        .add-task-btn { background: #007BFF; color: white; border: none; border-radius: 50%; width: 60px; height: 60px; font-size: 32px; cursor: pointer; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; }
        .add-task-btn:hover { background: #0056b3; }
        .task-form { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); margin-bottom: 30px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 15px; }
        .task-list { display: grid; gap: 15px; }
        .task-card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); display: flex; gap: 20px; align-items: flex-start; }
        .task-card:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .task-checkbox { width: 24px; height: 24px; cursor: pointer; margin-top: 5px; }
        .task-image-preview { width: 100px; height: 100px; object-fit: cover; border-radius: 8px; }
        .task-content { flex: 1; }
        .task-title { font-size: 18px; font-weight: 600; color: #333; margin-bottom: 5px; }
        .task-description { color: #666; font-size: 14px; }
      `}</style>
    </div>
  );
};

export default App;