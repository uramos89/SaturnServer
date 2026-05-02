import Database from "better-sqlite3";
const db = new Database("saturn.db");
const server = db.prepare("SELECT * FROM servers WHERE id = 'srv-192-168-174-130'").get();
const ssh = db.prepare("SELECT * FROM ssh_connections WHERE serverId = 'srv-192-168-174-130'").get();
console.log("Server:", JSON.stringify(server, null, 2));
console.log("SSH:", JSON.stringify(ssh, null, 2));
