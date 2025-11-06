// 文件类型映射
export const FILE_TYPES = {
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  DOCUMENT: 'document',
  ARCHIVE: 'archive',
  CODE: 'code',
  OTHER: 'other'
};

// 文件类型对应的文件夹
export const FOLDER_MAP = {
  [FILE_TYPES.IMAGE]: 'images',
  [FILE_TYPES.VIDEO]: 'videos',
  [FILE_TYPES.AUDIO]: 'audio',
  [FILE_TYPES.DOCUMENT]: 'documents',
  [FILE_TYPES.ARCHIVE]: 'archives',
  [FILE_TYPES.CODE]: 'code',
  [FILE_TYPES.OTHER]: 'files'
};

// MIME 类型映射（全面补充）
export const MIME_TYPE_MAP = {
  // ========== 图片 ==========
  'image/jpeg': FILE_TYPES.IMAGE,
  'image/jpg': FILE_TYPES.IMAGE,
  'image/png': FILE_TYPES.IMAGE,
  'image/gif': FILE_TYPES.IMAGE,
  'image/webp': FILE_TYPES.IMAGE,
  'image/svg+xml': FILE_TYPES.IMAGE,
  'image/bmp': FILE_TYPES.IMAGE,
  'image/tiff': FILE_TYPES.IMAGE,
  'image/x-icon': FILE_TYPES.IMAGE,
  'image/heic': FILE_TYPES.IMAGE,
  'image/heif': FILE_TYPES.IMAGE,
  
  // ========== 视频 ==========
  'video/mp4': FILE_TYPES.VIDEO,
  'video/webm': FILE_TYPES.VIDEO,
  'video/ogg': FILE_TYPES.VIDEO,
  'video/mpeg': FILE_TYPES.VIDEO,
  'video/quicktime': FILE_TYPES.VIDEO,
  'video/x-msvideo': FILE_TYPES.VIDEO, // avi
  'video/x-flv': FILE_TYPES.VIDEO,
  'video/x-matroska': FILE_TYPES.VIDEO, // mkv
  'video/3gpp': FILE_TYPES.VIDEO,
  'video/3gpp2': FILE_TYPES.VIDEO,
  
  // ========== 音频 ==========
  'audio/mpeg': FILE_TYPES.AUDIO,
  'audio/mp3': FILE_TYPES.AUDIO,
  'audio/wav': FILE_TYPES.AUDIO,
  'audio/ogg': FILE_TYPES.AUDIO,
  'audio/aac': FILE_TYPES.AUDIO,
  'audio/webm': FILE_TYPES.AUDIO,
  'audio/flac': FILE_TYPES.AUDIO,
  'audio/x-m4a': FILE_TYPES.AUDIO,
  'audio/midi': FILE_TYPES.AUDIO,
  'audio/x-ms-wma': FILE_TYPES.AUDIO,
  
  // ========== 文档 ==========
  'application/pdf': FILE_TYPES.DOCUMENT,
  // Microsoft Office
  'application/msword': FILE_TYPES.DOCUMENT, // doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': FILE_TYPES.DOCUMENT, // docx
  'application/vnd.ms-excel': FILE_TYPES.DOCUMENT, // xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': FILE_TYPES.DOCUMENT, // xlsx
  'application/vnd.ms-powerpoint': FILE_TYPES.DOCUMENT, // ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': FILE_TYPES.DOCUMENT, // pptx
  // OpenDocument
  'application/vnd.oasis.opendocument.text': FILE_TYPES.DOCUMENT, // odt
  'application/vnd.oasis.opendocument.spreadsheet': FILE_TYPES.DOCUMENT, // ods
  'application/vnd.oasis.opendocument.presentation': FILE_TYPES.DOCUMENT, // odp
  // 文本
  'text/plain': FILE_TYPES.DOCUMENT,
  'text/csv': FILE_TYPES.DOCUMENT,
  'text/markdown': FILE_TYPES.DOCUMENT,
  'application/rtf': FILE_TYPES.DOCUMENT,
  
  // ========== 压缩包（包含安装包）==========
  'application/zip': FILE_TYPES.ARCHIVE,
  'application/x-zip-compressed': FILE_TYPES.ARCHIVE,
  'application/x-rar-compressed': FILE_TYPES.ARCHIVE,
  'application/x-rar': FILE_TYPES.ARCHIVE,
  'application/vnd.rar': FILE_TYPES.ARCHIVE,
  'application/x-7z-compressed': FILE_TYPES.ARCHIVE,
  'application/gzip': FILE_TYPES.ARCHIVE,
  'application/x-gzip': FILE_TYPES.ARCHIVE,
  'application/x-tar': FILE_TYPES.ARCHIVE,
  'application/x-bzip': FILE_TYPES.ARCHIVE,
  'application/x-bzip2': FILE_TYPES.ARCHIVE,
  'application/x-compress': FILE_TYPES.ARCHIVE,
  'application/x-compressed': FILE_TYPES.ARCHIVE,
  // 安装包
  'application/vnd.android.package-archive': FILE_TYPES.ARCHIVE, // apk
  'application/x-msdownload': FILE_TYPES.ARCHIVE, // exe
  'application/x-msi': FILE_TYPES.ARCHIVE, // msi
  'application/x-ms-installer': FILE_TYPES.ARCHIVE, // msi
  'application/x-apple-diskimage': FILE_TYPES.ARCHIVE, // dmg
  'application/x-debian-package': FILE_TYPES.ARCHIVE, // deb
  'application/x-redhat-package-manager': FILE_TYPES.ARCHIVE, // rpm
  'application/x-rpm': FILE_TYPES.ARCHIVE,
  'application/octet-stream': FILE_TYPES.ARCHIVE, // 通用二进制文件
  
  // ========== 代码文件 ==========
  'text/html': FILE_TYPES.CODE,
  'text/css': FILE_TYPES.CODE,
  'text/javascript': FILE_TYPES.CODE,
  'application/javascript': FILE_TYPES.CODE,
  'application/json': FILE_TYPES.CODE,
  'application/xml': FILE_TYPES.CODE,
  'text/xml': FILE_TYPES.CODE,
  'application/x-python': FILE_TYPES.CODE,
  'text/x-python': FILE_TYPES.CODE,
  'text/x-java-source': FILE_TYPES.CODE,
  'text/x-c': FILE_TYPES.CODE,
  'text/x-c++': FILE_TYPES.CODE,
  'text/x-csharp': FILE_TYPES.CODE,
  'text/x-php': FILE_TYPES.CODE,
  'application/x-sh': FILE_TYPES.CODE,
  'text/x-shellscript': FILE_TYPES.CODE,
};

// 文件扩展名映射（补充 MIME 类型无法识别的情况）
export const EXTENSION_MAP = {
  // 图片
  jpg: FILE_TYPES.IMAGE,
  jpeg: FILE_TYPES.IMAGE,
  png: FILE_TYPES.IMAGE,
  gif: FILE_TYPES.IMAGE,
  webp: FILE_TYPES.IMAGE,
  svg: FILE_TYPES.IMAGE,
  bmp: FILE_TYPES.IMAGE,
  ico: FILE_TYPES.IMAGE,
  heic: FILE_TYPES.IMAGE,
  heif: FILE_TYPES.IMAGE,
  
  // 视频
  mp4: FILE_TYPES.VIDEO,
  webm: FILE_TYPES.VIDEO,
  avi: FILE_TYPES.VIDEO,
  mov: FILE_TYPES.VIDEO,
  mkv: FILE_TYPES.VIDEO,
  flv: FILE_TYPES.VIDEO,
  wmv: FILE_TYPES.VIDEO,
  '3gp': FILE_TYPES.VIDEO,
  
  // 音频
  mp3: FILE_TYPES.AUDIO,
  wav: FILE_TYPES.AUDIO,
  ogg: FILE_TYPES.AUDIO,
  aac: FILE_TYPES.AUDIO,
  flac: FILE_TYPES.AUDIO,
  m4a: FILE_TYPES.AUDIO,
  wma: FILE_TYPES.AUDIO,
  
  // 文档
  pdf: FILE_TYPES.DOCUMENT,
  doc: FILE_TYPES.DOCUMENT,
  docx: FILE_TYPES.DOCUMENT,
  xls: FILE_TYPES.DOCUMENT,
  xlsx: FILE_TYPES.DOCUMENT,
  ppt: FILE_TYPES.DOCUMENT,
  pptx: FILE_TYPES.DOCUMENT,
  txt: FILE_TYPES.DOCUMENT,
  md: FILE_TYPES.DOCUMENT,
  csv: FILE_TYPES.DOCUMENT,
  rtf: FILE_TYPES.DOCUMENT,
  
  // 压缩包和安装包
  zip: FILE_TYPES.ARCHIVE,
  rar: FILE_TYPES.ARCHIVE,
  '7z': FILE_TYPES.ARCHIVE,
  tar: FILE_TYPES.ARCHIVE,
  gz: FILE_TYPES.ARCHIVE,
  bz2: FILE_TYPES.ARCHIVE,
  apk: FILE_TYPES.ARCHIVE,
  exe: FILE_TYPES.ARCHIVE,
  msi: FILE_TYPES.ARCHIVE,
  dmg: FILE_TYPES.ARCHIVE,
  deb: FILE_TYPES.ARCHIVE,
  rpm: FILE_TYPES.ARCHIVE,
  pkg: FILE_TYPES.ARCHIVE,
  
  // 代码
  html: FILE_TYPES.CODE,
  css: FILE_TYPES.CODE,
  js: FILE_TYPES.CODE,
  jsx: FILE_TYPES.CODE,
  ts: FILE_TYPES.CODE,
  tsx: FILE_TYPES.CODE,
  json: FILE_TYPES.CODE,
  xml: FILE_TYPES.CODE,
  py: FILE_TYPES.CODE,
  java: FILE_TYPES.CODE,
  c: FILE_TYPES.CODE,
  cpp: FILE_TYPES.CODE,
  cs: FILE_TYPES.CODE,
  php: FILE_TYPES.CODE,
  sh: FILE_TYPES.CODE,
  bash: FILE_TYPES.CODE,
};

// 文件大小限制（字节）
export const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
export const SMALL_FILE_LIMIT = 25 * 1024 * 1024; // 25MB - Git API 限制
export const LARGE_FILE_LIMIT = 2 * 1024 * 1024 * 1024; // 2GB - Release API 限制
export const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB 分片大小