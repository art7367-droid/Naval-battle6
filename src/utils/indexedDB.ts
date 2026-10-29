import { StrategicMapData } from '../types/shipDatabase';

const DB_NAME = 'NavalBattleDB';
// 🪄 Поднимаем версию до 2, чтобы создать хранилище для гексов
const DB_VERSION = 2; 
const STORE_NAME_MAP = 'mapData';
const STORE_NAME_HEX = 'hexGrid';

/**
 * Открытие IndexedDB
 */
export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      reject(new Error('Не удалось открыть IndexedDB'));
    };
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Создание хранилища для данных карты (если его еще нет)
      if (!db.objectStoreNames.contains(STORE_NAME_MAP)) {
        db.createObjectStore(STORE_NAME_MAP, { keyPath: 'id' });
      }

      // Создание хранилища для гексов (если его еще нет)
      if (!db.objectStoreNames.contains(STORE_NAME_HEX)) {
        db.createObjectStore(STORE_NAME_HEX);
      }
    };
  });
}

/**
 * Сохранение данных карты (42 тайла) в IndexedDB
 */
export async function saveToIndexedDB(data: StrategicMapData): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME_MAP], 'readwrite');
    const store = transaction.objectStore(STORE_NAME_MAP);
    
    // Сохраняем данные с ключом 'strategicMap'
    const record = {
      id: 'strategicMap',
      ...data,
      timestamp: Date.now()
    };
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put(record);
      
      request.onsuccess = () => {
        console.log(`✅ Данные карты сохранены в IndexedDB (${data.tiles.length} тайлов)`);
        resolve();
      };
      
      request.onerror = () => {
        reject(new Error('Ошибка сохранения карты в IndexedDB'));
      };
    });
    
    db.close();
  } catch (error) {
    console.error('❌ Ошибка сохранения в IndexedDB:', error);
    throw error;
  }
}

/**
 * Загрузка данных карты (42 тайла) из IndexedDB
 */
export async function loadFromIndexedDB(): Promise<StrategicMapData | undefined> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME_MAP], 'readonly');
    const store = transaction.objectStore(STORE_NAME_MAP);
    
    return new Promise<StrategicMapData | undefined>((resolve, reject) => {
      const request = store.get('strategicMap');
      
      request.onsuccess = () => {
        if (request.result) {
          console.log(`✅ Карта загружена из IndexedDB: ${request.result.tiles?.length || 0} тайлов`);
          resolve(request.result);
        } else {
          resolve(undefined);
        }
      };
      
      request.onerror = () => {
        reject(new Error('Ошибка загрузки карты из IndexedDB'));
      };
    });
  } catch (error) {
    console.error('❌ Ошибка загрузки из IndexedDB:', error);
    return undefined;
  }
}

/**
 * Удаление данных карты из IndexedDB
 */
export async function deleteFromIndexedDB(): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME_MAP], 'readwrite');
    const store = transaction.objectStore(STORE_NAME_MAP);
    
    await new Promise<void>((resolve, reject) => {
      const request = store.delete('strategicMap');
      
      request.onsuccess = () => {
        console.log('✅ Данные карты удалены из IndexedDB');
        resolve();
      };
      
      request.onerror = () => {
        reject(new Error('Ошибка удаления из IndexedDB'));
      };
    });
    
    db.close();
  } catch (error) {
    console.error('❌ Ошибка удаления из IndexedDB:', error);
    throw error;
  }
}

/**
 * Миграция старых данных из localStorage в IndexedDB
 */
export async function migrateFromLocalStorage(): Promise<boolean> {
  try {
    const saved = localStorage.getItem('strategicMapData');
    if (!saved) {
      return false;
    }
    
    const data = JSON.parse(saved) as StrategicMapData;
    await saveToIndexedDB(data);
    
    localStorage.removeItem('strategicMapData');
    console.log('✅ Данные карты мигрированы из localStorage в IndexedDB');
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка миграции из localStorage:', error);
    return false;
  }
}