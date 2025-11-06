import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 数据库操作封装
export const db = {
  // ============================================
  // 文件操作
  // ============================================
  
  async getFiles({ folderId = null, isPublic = null, fileType = null, limit = 1000, offset = 0, includeExpired = false } = {}) {
    let query = supabase
      .from('files')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (folderId !== undefined) {
      if (folderId === null) {
        query = query.is('folder_id', null);
      } else {
        query = query.eq('folder_id', folderId);
      }
    }
    
    if (isPublic !== null) {
      query = query.eq('is_public', isPublic);
    }

    if (fileType) {
      query = query.eq('file_type', fileType);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    let files = data || [];
    
    // 如果不包含过期文件，则过滤掉
    if (!includeExpired) {
      files = files.filter(file => {
        if (!file.expire_at) return true;
        return new Date(file.expire_at) > new Date();
      });
    }
    
    return files;
  },
  
  async getFile(id) {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async getFileByShortCode(shortCode) {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('short_code', shortCode)
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async createFile(fileData) {
    const { data: shortCode } = await supabase.rpc('generate_short_code');
    
    const { data, error } = await supabase
      .from('files')
      .insert({
        ...fileData,
        short_code: shortCode,
        is_chunked: fileData.is_chunked || false,
        chunk_count: fileData.chunk_count || 1,
        chunk_paths: fileData.chunk_paths || [fileData.file_path],
        chunk_shas: fileData.chunk_shas || null
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async updateFile(id, updates) {
    const { data, error } = await supabase
      .from('files')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async deleteFile(id) {
    const { error } = await supabase
      .from('files')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
  
  // ============================================
  // 文件夹操作
  // ============================================
  
  async getFolders(parentId = null, fileType = null) {
    let query = supabase
      .from('folders')
      .select('*')
      .order('name');
    
    if (parentId === null) {
      query = query.is('parent_id', null);
    } else {
      query = query.eq('parent_id', parentId);
    }
    
    if (fileType && fileType !== 'all') {
      query = query.or(`file_type.eq.${fileType},file_type.eq.all`);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getFolder(id) {
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async createFolder(name, parentId = null, fileType = 'all') {
    let path = name;
    
    if (parentId) {
      const parent = await this.getFolder(parentId);
      path = `${parent.path}/${name}`;
    }
    
    const { data, error } = await supabase
      .from('folders')
      .insert({
        name,
        parent_id: parentId,
        path,
        file_type: fileType
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateFolder(id, updates) {
    const { data, error } = await supabase
      .from('folders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteFolder(id) {
    const { error: filesError } = await supabase
      .from('files')
      .delete()
      .eq('folder_id', id);
    
    if (filesError) throw filesError;

    const subfolders = await this.getFolders(id);
    for (const folder of subfolders) {
      await this.deleteFolder(folder.id);
    }

    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async moveFolder(id, newParentId) {
    const folder = await this.getFolder(id);
    
    let newPath = folder.name;
    if (newParentId) {
      const newParent = await this.getFolder(newParentId);
      newPath = `${newParent.path}/${folder.name}`;
    }
    
    const { data, error } = await supabase
      .from('folders')
      .update({
        parent_id: newParentId,
        path: newPath
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getFolderPath(folderId) {
    if (!folderId) return [];
    
    const folder = await this.getFolder(folderId);
    const pathParts = folder.path.split('/');
    
    const breadcrumbs = [];
    let currentPath = '';
    
    for (const part of pathParts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      
      const { data } = await supabase
        .from('folders')
        .select('id, name')
        .eq('path', currentPath)
        .single();
      
      if (data) {
        breadcrumbs.push(data);
      }
    }
    
    return breadcrumbs;
  },
  
  // ============================================
  // 设置操作
  // ============================================
  
  async getSetting(key) {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .single();
    
    if (error) throw error;
    return data.value;
  },
  
  async updateSetting(key, value) {
    const { error } = await supabase
      .from('settings')
      .update({ value })
      .eq('key', key);
    
    if (error) throw error;
  }
};

// 认证相关
export const auth = {
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  },
  
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
  
  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },
  
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },
  
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  }
};