import low from 'lowdb';
import FileSync from 'lowdb/adapters/FileAsync';
import path from 'path';
const adapter = new FileSync(path.resolve(__dirname,'../db.json'))

const db = async() => {
    return await low(adapter)
}

 
export {db};