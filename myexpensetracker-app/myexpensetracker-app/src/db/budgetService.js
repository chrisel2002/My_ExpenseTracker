import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export async function addCategory(uid, { name, budget }) {
  const ref = collection(db, "users", uid, "categories");

  return addDoc(ref, {
    name,
    budget: Number(budget),
    createdAt: serverTimestamp(),
  });
}
