import { collection, doc, getDoc, getDocs, setDoc, updateDoc, addDoc, query, where, deleteDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, getAuth as getSecondaryAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../firebase';

// Global Delete Ops
export const deleteWorkOrder = async (id) => deleteDoc(doc(db, 'WorkOrders', id));
export const deleteClient = async (id) => deleteDoc(doc(db, 'Clients', id));
export const deleteToolkit = async (id) => deleteDoc(doc(db, 'Toolkits', id));
export const deleteTechnician = async (uid) => deleteDoc(doc(db, 'Users', uid));

// Authentication
export const loginUser = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const logoutUser = async () => {
  return signOut(auth);
};

// Users
export const getUserProfile = async (uid) => {
  const docRef = doc(db, 'Users', uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

export const updateTechAvailability = async (uid, isAvailable) => {
  const docRef = doc(db, 'Users', uid);
  await updateDoc(docRef, { estado_disponibilidad: isAvailable ? 'Libre' : 'Ocupado' });
};

export const updateTechnician = async (uid, data) => {
  const docRef = doc(db, 'Users', uid);
  return updateDoc(docRef, data);
};

export const getTechnicians = async () => {
  const q = query(collection(db, 'Users'), where('rol', '==', 'tecnico'));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const createTechnicianAccount = async (email, password, nombre, telefono = '') => {
  const secondaryApp = initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  }, "SecondaryApp");
  
  const secondaryAuth = getSecondaryAuth(secondaryApp);
  
  try {
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const newUid = userCredential.user.uid;
    
    await setDoc(doc(db, 'Users', newUid), {
      nombre,
      email,
      telefono,
      rol: 'tecnico',
      estado_disponibilidad: 'Libre'
    });
    
    await secondaryAuth.signOut();
    await deleteApp(secondaryApp);
    return true;
  } catch (error) {
    await deleteApp(secondaryApp);
    throw error;
  }
};

// Clients
export const getClients = async () => {
  const snap = await getDocs(collection(db, 'Clients'));
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addClient = async (clientData) => {
  return addDoc(collection(db, 'Clients'), clientData);
};

export const updateClient = async (clientId, clientData) => {
  const docRef = doc(db, 'Clients', clientId);
  return updateDoc(docRef, clientData);
};

// Toolkits
export const getToolkits = async () => {
  const snap = await getDocs(collection(db, 'Toolkits'));
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const createToolkit = async (kitData) => {
  return addDoc(collection(db, 'Toolkits'), kitData);
};

export const updateToolkit = async (kitId, kitData) => {
  const docRef = doc(db, 'Toolkits', kitId);
  return updateDoc(docRef, kitData);
};

// Work Orders
export const getWorkOrders = async () => {
  const snap = await getDocs(collection(db, 'WorkOrders'));
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getWorkOrdersForTech = async (techId) => {
  const snap = await getDocs(collection(db, 'WorkOrders'));
  const allOrders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return allOrders.filter(o => 
    o.tecnico_asignado_id === techId || 
    (o.tecnicos_asignados_ids && o.tecnicos_asignados_ids.includes(techId))
  );
};

export const createWorkOrder = async (orderData) => {
  return addDoc(collection(db, 'WorkOrders'), orderData);
};

export const updateWorkOrderStatus = async (orderId, newStatus) => {
  const docRef = doc(db, 'WorkOrders', orderId);
  return updateDoc(docRef, { estado: newStatus });
};

export const updateWorkOrder = async (orderId, orderData) => {
  const docRef = doc(db, 'WorkOrders', orderId);
  return updateDoc(docRef, orderData);
};

export const updateWorkOrderNotes = async (orderId, notes) => {
  const docRef = doc(db, 'WorkOrders', orderId);
  return updateDoc(docRef, { notas_tecnico: notes });
};

export const uploadWorkOrderEvidence = async (orderId, file) => {
  const storageRef = ref(storage, `evidencias/${orderId}/${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  const url = await getDownloadURL(snapshot.ref);
  
  const docRef = doc(db, 'WorkOrders', orderId);
  await updateDoc(docRef, { foto_evidencia_url: url });
  
  return url;
};
