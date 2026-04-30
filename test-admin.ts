import * as admin from "firebase-admin";
console.log("Namespace:", typeof admin.apps, admin.apps);
import adminDefault from "firebase-admin";
console.log("Default:", typeof adminDefault?.apps, adminDefault?.apps);
