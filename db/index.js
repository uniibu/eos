import low from 'lowdb';
import FileSync from 'lowdb/adapters/FileAsync';

const adapter = new FileSync('db.json')

const db = async() => {
    return await low(adapter)
}

 
export {db};