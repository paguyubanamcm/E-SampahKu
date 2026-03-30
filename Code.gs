/**
 * SISTEM IURAN WARGA AMC MOJOSARI - BACKEND
 * File: Code.gs
 * Deskripsi: Menangani autentikasi, manajemen warga, dan pencatatan iuran.
 */

const SPREADSHEET_ID = 'MASUKKAN_ID_SPREADSHEET_LO_DISINI'; // Ganti dengan ID Spreadsheet lo
const SHEET_WARGA = 'DataWarga';
const SHEET_IURAN = 'DataIuran';
const SHEET_PENGATURAN = 'Pengaturan';

/**
 * BRIDGE VERCEL: Fungsi ini wajib ada agar Vercel bisa 'nembak' data ke sini.
 */
function doPost(e) {
  try {
    const requestData = JSON.parse(e.postData.contents);
    const functionName = requestData.functionName;
    const parameters = requestData.parameters || [];
    
    // Panggil fungsi yang diminta secara dinamis
    const result = this[functionName].apply(null, parameters);
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * LOGIKA LOGIN
 */
function prosesLogin(email, password) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_WARGA);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === email && data[i][2].toString() === password.toString()) {
      return {
        status: 'success',
        user: {
          id: data[i][0],
          email: data[i][1],
          nama: data[i][3],
          blok: data[i][4],
          no: data[i][5],
          wa: data[i][6],
          role: data[i][7]
        }
      };
    }
  }
  return { status: 'error', message: 'Email atau Password salah!' };
}

/**
 * AMBIL SEMUA DATA WARGA (ADMIN ONLY)
 */
function getSemuaWarga() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_WARGA);
  const data = sheet.getDataRange().getValues();
  const result = [];
  
  for (let i = 1; i < data.length; i++) {
    result.push({
      id: data[i][0],
      email: data[i][1],
      nama: data[i][3],
      blok: data[i][4],
      no: data[i][5],
      wa: data[i][6],
      role: data[i][7]
    });
  }
  return result;
}

/**
 * SIMPAN WARGA BARU
 */
function simpanWargaBaru(email, pass, nama, blok, no, wa, role) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_WARGA);
  const id = "W-" + new Date().getTime();
  
  sheet.appendRow([id, email, pass, nama, blok, no, wa, role]);
  
  // Inisialisasi baris iuran kosong di Sheet Iuran
  const iuranSheet = ss.getSheetByName(SHEET_IURAN);
  const barisIuran = [id, nama];
  for(let i=0; i<12; i++) barisIuran.push("Belum Bayar");
  iuranSheet.appendRow(barisIuran);
  
  return { status: 'success', message: 'Warga berhasil ditambahkan!' };
}

/**
 * EDIT DATA WARGA
 */
function editWarga(id, email, pass, nama, blok, no, wa, role, adminRole) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_WARGA);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      if (pass !== "") sheet.getRange(i + 1, 3).setValue(pass);
      sheet.getRange(i + 1, 2).setValue(email);
      sheet.getRange(i + 1, 4).setValue(nama);
      sheet.getRange(i + 1, 5).setValue(blok);
      sheet.getRange(i + 1, 6).setValue(no);
      sheet.getRange(i + 1, 7).setValue(wa);
      if (adminRole === 'superadmin') sheet.getRange(i + 1, 8).setValue(role);
      return "Data berhasil diperbarui!";
    }
  }
  return "Data tidak ditemukan!";
}

/**
 * HAPUS WARGA
 */
function hapusWarga(id, adminRole) {
  if (adminRole !== 'superadmin' && adminRole !== 'admin') return "Akses ditolak!";
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheetW = ss.getSheetByName(SHEET_WARGA);
  const sheetI = ss.getSheetByName(SHEET_IURAN);
  
  // Hapus di sheet warga
  const dataW = sheetW.getDataRange().getValues();
  for(let i=1; i<dataW.length; i++) {
    if(dataW[i][0] === id) {
      sheetW.deleteRow(i + 1);
      break;
    }
  }
  
  // Hapus di sheet iuran
  const dataI = sheetI.getDataRange().getValues();
  for(let j=1; j<dataI.length; j++) {
    if(dataI[j][0] === id) {
      sheetI.deleteRow(j + 1);
      break;
    }
  }
  
  return "Warga dan riwayat iuran berhasil dihapus!";
}

/**
 * UPDATE PENGATURAN (BIAYA & PENGUMUMAN)
 */
function simpanPengaturan(nominal, pengumuman) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_PENGATURAN);
  sheet.getRange("B1").setValue(nominal);
  sheet.getRange("B2").setValue(pengumuman);
  return "Pengaturan berhasil disimpan!";
}
