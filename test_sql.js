const initSqlJs = require('sql.js');

async function test() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run("CREATE TABLE foo (id INTEGER PRIMARY KEY AUTOINCREMENT, val TEXT)");
  
  const stmt = db.prepare("INSERT INTO foo (val) VALUES (?)");
  stmt.run(["hello"]);
  stmt.free();
  
  let res1 = db.exec("SELECT last_insert_rowid()");
  console.log("after stmt.run:", res1[0].values[0][0]);
  
  // What if we saveDB?
  const data = db.export(); 
  let res2 = db.exec("SELECT last_insert_rowid()");
  console.log("after db.export():", res2[0].values[0][0]);

  db.run("INSERT INTO foo (val) VALUES (?)", ["world"]);
  let res3 = db.exec("SELECT last_insert_rowid()");
  console.log("after db.run:", res3[0].values[0][0]);

  // Try db.run(sql, args)
  const data2 = db.export();
  try {
     const stmt2 = db.prepare("UPDATE foo SET val = ? WHERE id = 2");
     stmt2.run(["test"]);
     stmt2.free();
     console.log('Update worked');
  } catch(e) { console.error('stmt.run update error', e) }
}

test();
