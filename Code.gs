// ==========================================
// 1. SETUP DATABASE & TRIGGER OTOMATIS
// ==========================================
function setupApp() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var sheetUsers = ss.getSheetByName('Users');
  if (!sheetUsers) {
    sheetUsers = ss.insertSheet('Users');
    sheetUsers.appendRow(['ID_User', 'Email', 'Password_Hash', 'Nama', 'Blok', 'No_Rumah', 'No_WA', 'Role', 'Foto_Profil']);
    sheetUsers.getRange("A1:I1").setFontWeight("bold");
    
    var passHash = hashPassword("admin123");
    sheetUsers.appendRow(['USR-001', 'superadmin@amcm.com', passHash, 'Superadmin AMCM', 'Admin', '01', '081234567890', 'superadmin', '']);
    sheetUsers.appendRow(['USR-002', 'admin@amcm.com', passHash, 'Admin AMCM', 'Admin', '02', '081234567891', 'admin', '']);
  }

  var sheetBayar = ss.getSheetByName('Pembayaran');
  if (!sheetBayar) {
    sheetBayar = ss.insertSheet('Pembayaran');
    sheetBayar.appendRow(['ID_Bayar', 'ID_User', 'Bulan', 'Tahun', 'Nominal', 'Bukti_Bayar', 'Status', 'Tgl_Upload']);
    sheetBayar.getRange("A1:H1").setFontWeight("bold");
  }

  var scriptProps = PropertiesService.getScriptProperties();
  if (!scriptProps.getProperty('FOLDER_ID')) {
    var folder = DriveApp.createFolder("Aplikasi_Iuran_AMCM_Files");
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    scriptProps.setProperty('FOLDER_ID', folder.getId());
  }
  if (!scriptProps.getProperty('BIAYA_IURAN')) {
    scriptProps.setProperty('BIAYA_IURAN', '30000'); 
  }

  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('kirimPengingatOtomatis').timeBased().everyDays(1).atHour(8).create();

  return "Setup Berhasil! Trigger pengingat harian aktif.";
}

// ==========================================
// 2. ROUTING, UTILITIES & HASH
// ==========================================
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index').setTitle('E-SampahKu AMCM').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function hashPassword(password) {
  var salt = "eval-sha256-4vpsisrBP00v+tF/SsQ3RXWWYF28JSvTpR9D/wrxn/0=";
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + password);
  var txtHash = '';
  for (var j = 0; j < rawHash.length; j++) {
    var hashVal = rawHash[j];
    if (hashVal < 0) hashVal += 256;
    if (hashVal.toString(16).length == 1) txtHash += '0';
    txtHash += hashVal.toString(16);
  }
  return txtHash;
}

// ==========================================
// 3. FUNGSI LOGIN & AUTENTIKASI
// ==========================================
function prosesLogin(email, password) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
  var data = sheet.getDataRange().getValues();
  var passHash = hashPassword(password);

  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === email && data[i][2] === passHash) {
      return {
        status: 'success',
        user: { id: data[i][0], email: data[i][1], nama: data[i][3], blok: data[i][4], no_rumah: data[i][5], no_wa: data[i][6], role: data[i][7], foto: data[i][8] },
        biaya: PropertiesService.getScriptProperties().getProperty('BIAYA_IURAN') || '30000',
        pengumuman: PropertiesService.getScriptProperties().getProperty('PENGUMUMAN') || ''
      };
    }
  }
  return { status: 'error', message: 'Kredensial salah' };
}

// ==========================================
// 4. UPLOAD FILE KE DRIVE
// ==========================================
function uploadFileToDrive(base64Data, fileName) {
  try {
    var folderId = PropertiesService.getScriptProperties().getProperty('FOLDER_ID');
    var folder = DriveApp.getFolderById(folderId);
    var splitBase = base64Data.split(',');
    var type = splitBase[0].split(';')[0].replace('data:', '');
    var byteCharacters = Utilities.base64Decode(splitBase[1]);
    var blob = Utilities.newBlob(byteCharacters, type, fileName);
    
    var file = folder.createFile(blob);
    return "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w800"; 
  } catch (e) {
    throw new Error("Gagal upload ke Google Drive: " + e.message);
  }
}

// ==========================================
// 5. DASHBOARD & PEMBAYARAN
// ==========================================
function getDashboardData(role, userId) {
  var dataBayar = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Pembayaran').getDataRange().getValues();
  var biayaAktual = parseInt(PropertiesService.getScriptProperties().getProperty('BIAYA_IURAN') || '30000');
  var result = { tagihan_warga: [], summary: { total_masuk: 0, lunas: 0, belum: 0 }, biaya: biayaAktual };
  
  var currentYear = new Date().getFullYear();
  var bulanIndo = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  
  var userPayments = dataBayar.filter(r => r[1] === userId && r[3] == currentYear);
  
  for (var i = 0; i < 12; i++) {
    var record = userPayments.find(r => r[2] === bulanIndo[i]);
    if (record) {
      result.tagihan_warga.push({ 
        id: record[0] ? String(record[0]) : '', 
        bulan: record[2] ? String(record[2]) : '', 
        tahun: record[3] ? String(record[3]) : '', 
        nominal: record[4] ? Number(record[4]) : 0, 
        bukti: record[5] ? String(record[5]) : '', 
        status: record[6] ? String(record[6]) : '' 
      });
    } else {
      result.tagihan_warga.push({ 
        id: 'NEW_'+i, 
        bulan: bulanIndo[i], 
        tahun: currentYear, 
        nominal: biayaAktual, 
        bukti: '', 
        status: 'Belum Bayar'
      });
    }
  }
  
  if (role !== 'warga') {
    for (var i = 1; i < dataBayar.length; i++) {
      if (dataBayar[i][6] === 'Lunas') { result.summary.lunas++; result.summary.total_masuk += parseInt(dataBayar[i][4]); } 
      else if (dataBayar[i][6] === 'Menunggu') { result.summary.belum++; }
    }
  }
  return result;
}

function simpanPembayaran(userId, bulan, tahun, nominal, base64Bukti) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Pembayaran');
  var data = sheet.getDataRange().getValues();
  var urlBukti = uploadFileToDrive(base64Bukti, 'Struk_' + userId + '_' + bulan + '_' + tahun);
  
  var rowToUpdate = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === userId && data[i][2] === bulan && data[i][3] == tahun) { rowToUpdate = i + 1; break; }
  }

  if (rowToUpdate > -1) {
    sheet.getRange(rowToUpdate, 6).setValue(urlBukti);
    sheet.getRange(rowToUpdate, 7).setValue('Menunggu');
  } else {
    sheet.appendRow(["INV-" + new Date().getTime(), userId, bulan, tahun, nominal, urlBukti, 'Menunggu', new Date().toLocaleString()]);
  }
  return "Bukti terkirim! Menunggu ACC.";
}

function simpanPembayaranMulti(userId, listBulan, tahun, nominalPerBulan, base64Bukti) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Pembayaran');
  var data = sheet.getDataRange().getValues();
  
  var urlBukti = uploadFileToDrive(base64Bukti, 'Struk_Multi_' + userId + '_' + listBulan[0] + '_sd_' + listBulan[listBulan.length-1] + '_' + tahun);
  var tglUpload = new Date().toLocaleString();
  
  for (var b = 0; b < listBulan.length; b++) {
    var bulan = listBulan[b];
    var rowToUpdate = -1;
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][1] === userId && data[i][2] === bulan && data[i][3] == tahun) { 
        rowToUpdate = i + 1; break; 
      }
    }

    if (rowToUpdate > -1) {
      sheet.getRange(rowToUpdate, 6).setValue(urlBukti);
      sheet.getRange(rowToUpdate, 7).setValue('Menunggu');
      sheet.getRange(rowToUpdate, 8).setValue(tglUpload);
    } else {
      var newId = "INV-" + new Date().getTime() + "-" + b; 
      sheet.appendRow([newId, userId, bulan, tahun, nominalPerBulan, urlBukti, 'Menunggu', tglUpload]);
    }
  }
  return "Bukti pembayaran berhasil dikirim!";
}

// ==========================================
// 6. VALIDASI ADMIN & LAPORAN
// ==========================================
function getValidasiData() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetBayar = ss.getSheetByName('Pembayaran');
    var sheetUsers = ss.getSheetByName('Users');
    if(!sheetBayar || !sheetUsers) return [];

    var dataBayar = sheetBayar.getDataRange().getValues();
    var dataUsers = sheetUsers.getDataRange().getValues();
    var listValidasi = [];
    
    for (var i = 1; i < dataBayar.length; i++) {
      if (dataBayar[i][6] === 'Menunggu') {
        var userId = dataBayar[i][1];
        var user = dataUsers.find(u => u[0] === userId);
        
        var id_bayar = dataBayar[i][0] ? String(dataBayar[i][0]) : '-';
        var bulan = dataBayar[i][2] ? String(dataBayar[i][2]) : '-';
        var tahun = dataBayar[i][3] ? String(dataBayar[i][3]) : '-';
        var nominal = dataBayar[i][4] ? Number(dataBayar[i][4]) : 0;
        var bukti = dataBayar[i][5] ? String(dataBayar[i][5]) : '';
        var tgl = dataBayar[i][7] ? String(dataBayar[i][7]) : '-'; 
        
        var namaWarga = (user && user[3]) ? String(user[3]) : 'Nama Tidak Diketahui';
        var blokWarga = (user && user[4]) ? String(user[4]) + '/' + String(user[5]) : '-';

        listValidasi.push({
          id_bayar: id_bayar, nama: namaWarga, blok: blokWarga, bulan: bulan, tahun: tahun, nominal: nominal, bukti: bukti, tgl: tgl
        });
      }
    }
    return listValidasi.reverse();
  } catch(e) { return []; }
}

function prosesValidasi(idBayar, aksi) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Pembayaran');
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === idBayar) {
      sheet.getRange(i + 1, 7).setValue(aksi === 'acc' ? 'Lunas' : 'Ditolak');
      return "Status diupdate!";
    }
  }
}

function getLaporanTagihanSemuaWarga(tahun, roleUser) {
  if (roleUser !== 'admin' && roleUser !== 'superadmin') {
    return { status: 'error', message: 'Akses Ditolak: Hanya Admin dan Superadmin yang bisa melihat laporan ini.' };
  }

  if (!tahun) tahun = new Date().getFullYear();
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dataUsers = ss.getSheetByName('Users').getDataRange().getValues();
  var dataBayar = ss.getSheetByName('Pembayaran').getDataRange().getValues();
  
  var result = [];
  var bulanIndo = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var biayaAktual = parseInt(PropertiesService.getScriptProperties().getProperty('BIAYA_IURAN') || '30000');

  var paymentsTahunIni = dataBayar.filter(r => r[3] == tahun);

  for (var i = 1; i < dataUsers.length; i++) {
    var userId = dataUsers[i][0];
    var role = dataUsers[i][7];
    var namaLengkap = dataUsers[i][3];
    
    if (role !== 'warga') {
       namaLengkap += ' (' + role.toUpperCase() + ')';
    }

    var blok = dataUsers[i][4] + '/' + dataUsers[i][5];
    var wa = dataUsers[i][6];
    
    var tagihanUser = [];
    var userPayments = paymentsTahunIni.filter(r => r[1] === userId);

    for (var b = 0; b < 12; b++) {
      var record = userPayments.find(r => r[2] === bulanIndo[b]);
      if (record) {
        tagihanUser.push({ bulan: bulanIndo[b], status: record[6] ? String(record[6]) : '', nominal: record[4] ? Number(record[4]) : 0 });
      } else {
        tagihanUser.push({ bulan: bulanIndo[b], status: 'Belum Bayar', nominal: biayaAktual });
      }
    }

    result.push({ id: userId, nama: namaLengkap, blok: blok, no_wa: wa, tagihan_12_bulan: tagihanUser });
  }
  
  return { status: 'success', tahun: tahun, data: result };
}

// ==========================================
// 7. DATA WARGA & PENGATURAN (DIPERBARUI)
// ==========================================
function getSemuaWarga() {
  var data = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users').getDataRange().getValues();
  var warga = [];
  for(var i=1; i<data.length; i++){
    warga.push({ id: data[i][0], email: data[i][1], nama: data[i][3], blok: data[i][4], no: data[i][5], wa: data[i][6], role: data[i][7] });
  }
  return warga;
}

// Tambahan parameter `aktorRole` agar Admin bisa menambah warga baru
function simpanWargaBaru(email, pass, nama, blok, no_rumah, no_wa, aktorRole) {
  // Hanya admin dan superadmin yang boleh menambah warga
  if (aktorRole !== 'superadmin' && aktorRole !== 'admin') {
     return { status: 'error', message: "Ditolak: Anda tidak memiliki akses untuk menambah data!" };
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][6] == no_wa) {
      return { status: 'error', message: "Error: Nomor WA ini sudah terdaftar!" };
    }
  }

  // Warga baru default rolenya adalah 'warga'
  sheet.appendRow(["USR-" + new Date().getTime(), email, hashPassword(pass), nama, blok, no_rumah, no_wa, 'warga', '']);
  
  var scriptProps = PropertiesService.getScriptProperties();
  var pengumumanLama = scriptProps.getProperty('PENGUMUMAN') || "";
  var pesanSambut = "🎉 SELAMAT DATANG WARGA BARU!\nMari kita sambut dengan hangat " + nama + " yang baru saja bergabung di Blok " + blok + " No. " + no_rumah + ".\nSemoga betah dan rukun bersama keluarga besar AMCM.";
  var pengumumanBaru = pesanSambut;
  if (pengumumanLama.trim() !== "") {
      pengumumanBaru = pesanSambut + "\n\n---\nInfo Lainnya:\n" + pengumumanLama;
  }
  
  scriptProps.setProperty('PENGUMUMAN', pengumumanBaru);
  return { status: 'success', message: "Warga ditambahkan & Pengumuman otomatis diupdate!", pengumumanBaru: pengumumanBaru };
}

// FUNGSI EDIT YANG DIPERBARUI: Admin bisa edit form apapun KECUALI role dan data Superadmin
function editWarga(id, email, pass, nama, blok, no_rumah, no_wa, role, aktorRole) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      
      var targetRoleLama = data[i][7];
      
      if (aktorRole === 'admin' || aktorRole === 'superadmin') {
          // Admin tidak boleh edit akun Superadmin
          if (aktorRole === 'admin' && targetRoleLama === 'superadmin') {
             return "Gagal: Anda tidak berhak mengubah data Superadmin!";
          }
          
          // Izinkan update seluruh isian form biasa (Email, Password, Nama, Blok, No Rumah, WA)
          sheet.getRange(i + 1, 2).setValue(email);
          if (pass !== "") sheet.getRange(i + 1, 3).setValue(hashPassword(pass));
          sheet.getRange(i + 1, 4).setValue(nama);
          sheet.getRange(i + 1, 5).setValue(blok);
          sheet.getRange(i + 1, 6).setValue(no_rumah);
          sheet.getRange(i + 1, 7).setValue(no_wa);
          
          // Logika khusus Role / Hak Akses
          if (aktorRole === 'superadmin') {
              // Validasi agar Superadmin utama tidak hilang atau tambah baru
              if (targetRoleLama === 'superadmin' && role !== 'superadmin') return "Gagal: Superadmin utama tidak bisa diubah role-nya!";
              if (targetRoleLama !== 'superadmin' && role === 'superadmin') return "Gagal: Tidak bisa menambah Superadmin baru!";
              if (targetRoleLama !== 'admin' && role === 'admin') {
                for (var j = 1; j < data.length; j++) {
                  if (data[j][7] === 'admin') return "Gagal: Maksimal hanya boleh ada 1 Admin! Ubah dulu Admin lama menjadi warga.";
                }
              }
              sheet.getRange(i + 1, 8).setValue(role);
          } else if (aktorRole === 'admin') {
              // Paksa role tetap seperti lama (Admin tidak boleh ubah-ubah Role)
              sheet.getRange(i + 1, 8).setValue(targetRoleLama); 
          }
          
          return "Berhasil: Data Warga Berhasil Diupdate!";
      } else {
          return "Gagal: Anda tidak memiliki akses merubah data!";
      }
    }
  }
}

// FUNGSI HAPUS: Admin tidak bisa menghapus Superadmin atau sesama Admin
function hapusWarga(userId, aktorRole) {
  if (aktorRole !== 'superadmin' && aktorRole !== 'admin') {
      return "Ditolak: Anda tidak berhak menghapus warga!";
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetUsers = ss.getSheetByName('Users');
  var dataUsers = sheetUsers.getDataRange().getValues();
  for (var i = 1; i < dataUsers.length; i++) {
    if (dataUsers[i][0] === userId) {
      if (dataUsers[i][7] === 'superadmin') return "Ditolak: Superadmin tidak bisa dihapus!";
      
      // Admin tidak boleh hapus akun sesama admin/dirinya sendiri
      if (dataUsers[i][7] === 'admin' && aktorRole === 'admin') {
          return "Ditolak: Admin hanya dapat menghapus akun warga!";
      }
      
      sheetUsers.deleteRow(i + 1); break;
    }
  }
  var sheetBayar = ss.getSheetByName('Pembayaran');
  var dataBayar = sheetBayar.getDataRange().getValues();
  for (var i = dataBayar.length - 1; i >= 1; i--) { 
    if (dataBayar[i][1] === userId) sheetBayar.deleteRow(i + 1);
  }
  return "Warga dihapus permanen!";
}

function simpanPengaturan(nominalBaru, pengumumanBaru) {
  PropertiesService.getScriptProperties().setProperty('BIAYA_IURAN', nominalBaru.toString());
  PropertiesService.getScriptProperties().setProperty('PENGUMUMAN', pengumumanBaru.toString());
  return "Biaya Iuran & Pengumuman berhasil diupdate!";
}

function updateProfil(userId, email, nama, blok, no_rumah, noWa, passwordBaru, base64Foto) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      sheet.getRange(i + 1, 2).setValue(email);
      sheet.getRange(i + 1, 4).setValue(nama);
      sheet.getRange(i + 1, 5).setValue(blok);
      sheet.getRange(i + 1, 6).setValue(no_rumah);
      sheet.getRange(i + 1, 7).setValue(noWa);
      if (passwordBaru !== "") sheet.getRange(i + 1, 3).setValue(hashPassword(passwordBaru));
      
      var newFotoUrl = data[i][8]; 
      if (base64Foto !== "") {
        var uploadedUrl = uploadFileToDrive(base64Foto, 'Foto_' + userId);
        if(uploadedUrl) {
          newFotoUrl = uploadedUrl;
          sheet.getRange(i + 1, 9).setValue(newFotoUrl); 
        }
      }
      return { status: 'success', user: { id: userId, email: email, nama: nama, blok: blok, no_rumah: no_rumah, no_wa: noWa, role: data[i][7], foto: newFotoUrl } };
    }
  }
  return { status: 'error', message: 'User tidak ditemukan' };
}

// ==========================================
// 8. PENGINGAT EMAIL OTOMATIS
// ==========================================
function kirimPengingatOtomatis() {
  var today = new Date();
  var date = today.getDate();
  if ([29, 30, 31, 1, 2].indexOf(date) === -1) return;
  
  var targetBulanIndex = today.getMonth(); 
  var targetTahun = today.getFullYear();
  if (date >= 29) {
    targetBulanIndex += 1;
    if (targetBulanIndex > 11) { targetBulanIndex = 0; targetTahun += 1; }
  }
  var namaBulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][targetBulanIndex];
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var users = ss.getSheetByName('Users').getDataRange().getValues();
  var payments = ss.getSheetByName('Pembayaran').getDataRange().getValues();
  
  for (var i = 1; i < users.length; i++) {
    var userId = users[i][0];
    var emailWarga = users[i][1]; 
    var nama = users[i][3];
    
    var sudahBayar = false;
    for (var j = 1; j < payments.length; j++) {
      if (payments[j][1] === userId && payments[j][2] === namaBulan && payments[j][3] == targetTahun) {
        if (payments[j][6] === 'Lunas' || payments[j][6] === 'Menunggu') {
          sudahBayar = true; break;
        }
      }
    }
    
    if (!sudahBayar && emailWarga) {
      var subjectEmail = "🔔 PENGINGAT IURAN SAMPAH AMCM";
      var pesanEmail = "Halo " + nama + ",\n\nMohon Segera Menyelesaikan Pembayaran Iuran Sampah Bulan " + namaBulan + " " + targetTahun + ".\n\nTerima Kasih.";
      try { MailApp.sendEmail(emailWarga, subjectEmail, pesanEmail); } catch(e) {}
    }
  }
}

// ==========================================
// 9. JURUS DARURAT & CLEANUP DUPLIKAT
// ==========================================
function resetSuperadmin() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
  var data = sheet.getDataRange().getValues();
  var passHash = hashPassword("admin123"); 
  for (var i = 1; i < data.length; i++) {
    if (data[i][7] === 'superadmin') {
      sheet.getRange(i + 1, 2).setValue('superadmin@amcm.com');
      sheet.getRange(i + 1, 3).setValue(passHash);             
      return "Berhasil Reset! Email: superadmin@amcm.com, Pass: admin123";
    }
  }
}

function bersihkanDuplikatWA() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Users');
  var data = sheet.getDataRange().getValues();
  var seenWA = {};
  var rowsToDelete = [];

  for (var i = 1; i < data.length; i++) {
    var wa = data[i][6]; 
    if (wa) {
      if (seenWA[wa]) { rowsToDelete.push(i + 1); } else { seenWA[wa] = true; }
    }
  }

  for (var j = rowsToDelete.length - 1; j >= 0; j--) {
    sheet.deleteRow(rowsToDelete[j]);
  }

  return "Pembersihan selesai! " + rowsToDelete.length + " data duplikat dihapus.";
}

function resetSemuaDataPembayaran(aktorRole) {
  if (aktorRole !== 'superadmin') {
    return "Gagal: Hanya Superadmin yang berhak melakukan reset total data pembayaran!";
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetBayar = ss.getSheetByName('Pembayaran');
  
  if (!sheetBayar) return "Error: Sheet Pembayaran tidak ditemukan.";

  var lastRow = sheetBayar.getLastRow();
  if (lastRow > 1) {
    sheetBayar.deleteRows(2, lastRow - 1);
  }

  return "Sukses: Seluruh data riwayat pembayaran dan tagihan semua warga telah dihapus bersih!";
}