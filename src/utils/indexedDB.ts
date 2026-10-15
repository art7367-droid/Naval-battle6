import { StrategicMapData } from '../types/shipDatabase';

const DB_NAME = 'NavalBattleDB';
const DB_VERSION = 1;
const STORE_NAME = 'mapData';

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
      
      // Создание хранилища для данных карты
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Сохранение данных карты в IndexedDB
 */
export async function saveToIndexedDB(data: StrategicMapData): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // Сохраняем данные с ключом 'strategicMap'
    const record = {
      id: 'strategicMap',
      ...data,
      timestamp: Date.now()
    };
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put(record);
      
      request.onsuccess = () => {
        console.log(`✅ Данные сохранены в IndexedDB (${data.tiles.length} тайлов)`);
        resolve();
      };
      
      request.onerror = () => {
        reject(new Error('Ошибка сохранения в IndexedDB'));
      };
    });
    
    db.close();
  } catch (error) {
    console.error('❌ Ошибка сохранения в IndexedDB:', error);
    throw error;
  }
}

/**
 * Загрузка данных карты из IndexedDB
 */
export async function loadFromIndexedDB(): Promise<StrategicMapData | undefined> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise<StrategicMapData | undefined>((resolve, reject) => {
      const request = store.get('strategicMap');
      
      request.onsuccess = () => {
        if (request.result) {
          console.log(`✅ Загружено из IndexedDB: ${request.result.tiles?.length || 0} тайлов`);
          resolve(request.result);
        } else {
          resolve(undefined);
        }
      };
      
      request.onerror = () => {
        reject(new Error('Ошибка загрузки из IndexedDB'));
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
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    await new Promise<void>((resolve, reject) => {
      const request = store.delete('strategicMap');
      
      request.onsuccess = () => {
        console.log('✅ Данные удалены из IndexedDB');
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
 * Получение информации о хранилище
 */
export async function getStorageInfo(): Promise<{ used: number; quota: number } | null> {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0
      };
    }
    return null;
  } catch (error) {
    console.error('❌ Ошибка получения информации о хранилище:', error);
    return null;
  }
}

/**
 * Миграция данных из localStorage в IndexedDB
 */
export async function migrateFromLocalStorage(): Promise<boolean> {
  try {
    const saved = localStorage.getItem('strategicMapData');
    if (!saved) {
      return false;
    }
    
    const data = JSON.parse(saved) as StrategicMapData;
    await saveToIndexedDB(data);
    
    // Удаляем из localStorage после успешной миграции
    localStorage.removeItem('strategicMapData');
    console.log('✅ Данные мигрированы из localStorage в IndexedDB');
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка миграции из localStorage:', error);
    return false;
  }
}
