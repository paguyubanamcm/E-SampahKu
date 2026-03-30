/**
 * PART 3 - PAYMENT, RESIDENT MANAGEMENT, AND SETTINGS
 * Disesuaikan untuk koneksi callGAS (Vercel Ready)
 */

function bukaModalBayar(bulan, tahun, idxBulan) {
  document.getElementById('bayarBulanMulaiIdx').value = idxBulan;
  document.getElementById('bayarTahun').value = tahun;
  document.getElementById('lblBulanMulai').value = `${bulan} ${tahun}`;
  
  let namaBulanAll = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  let selectSampai = document.getElementById('pilihanBulanSampai');
  selectSampai.innerHTML = ''; 
  
  for(let i = idxBulan; i < 12; i++) {
    let option = document.createElement('option');
    option.value = i;
    option.text = namaBulanAll[i] + ' ' + tahun;
    selectSampai.appendChild(option);
  }
  
  hitungTotalBayar();
  new bootstrap.Modal(document.getElementById('modalBayar')).show();
}

function hitungTotalBayar() {
  let startIdx = parseInt(document.getElementById('bayarBulanMulaiIdx').value);
  let endIdx = parseInt(document.getElementById('pilihanBulanSampai').value);
  let jumlahBulan = (endIdx - startIdx) + 1;
  document.getElementById('totalBayarText').innerText = 'Rp ' + (jumlahBulan * globalBiaya).toLocaleString('id-ID');
}

async function handleUploadBayar(e) {
  e.preventDefault();
  const fileInput = document.getElementById('fileBukti');
  if (!fileInput.files[0]) {
    alert("Silakan pilih file bukti transfer.");
    return;
  }

  showLoader(true);
  bootstrap.Modal.getInstance(document.getElementById('modalBayar')).hide();
  
  let idxMulai = parseInt(document.getElementById('bayarBulanMulaiIdx').value);
  let idxSampai = parseInt(document.getElementById('pilihanBulanSampai').value);
  let tahun = document.getElementById('bayarTahun').value;
  let namaBulanAll = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  
  let listBulanBayar = [];
  for(let i = idxMulai; i <= idxSampai; i++) {
    listBulanBayar.push(namaBulanAll[i]);
  }
  
  try {
    const base64Str = await compressImage(fileInput.files[0]);
    // GANTI: google.script.run -> callGAS
    const res = await callGAS('simpanPembayaranMulti', currentUser.id, listBulanBayar, tahun, globalBiaya, base64Str);
    showLoader(false);
    alert(res);
    loadDashboardData();
  } catch (err) {
    showLoader(false);
    alert("Gagal: " + err.message);
  }
}

let globalWargaData = [];

async function loadWargaData() {
  showLoader(true);
  try {
    // GANTI: google.script.run -> callGAS
    const data = await callGAS('getSemuaWarga');
    showLoader(false);
    let html = '';
    globalWargaData = data;
    
    data.forEach(d => { 
      let badgeColor = d.role === 'superadmin' ? 'bg-danger' : (d.role === 'admin' ? 'bg-primary' : 'bg-secondary');
      let aksiEdit = `<button class="btn btn-sm btn-info text-white shadow-sm" onclick="bukaEditWarga('${d.id}')"><i class="fas fa-edit"></i></button>`;
      let aksiHapus = '';
      
      if (currentUser.role === 'superadmin' && d.role !== 'superadmin') {
        aksiHapus = `<button class="btn btn-sm btn-danger shadow-sm" onclick="handleHapusWarga('${d.id}')"><i class="fas fa-trash"></i></button>`;
      } else if (currentUser.role === 'admin') {
        if (d.role === 'superadmin') {
          aksiEdit = `<span class="badge bg-secondary py-2"><i class="fas fa-lock"></i> Locked</span>`;
        } else if (d.role === 'warga') {
          aksiHapus = `<button class="btn btn-sm btn-danger shadow-sm" onclick="handleHapusWarga('${d.id}')"><i class="fas fa-trash"></i></button>`;
        }
      }
      
      let namaTampil = d.nama || '';
      if (!namaTampil.includes('Bpk.') && !namaTampil.includes('Ibu.')) {
        namaTampil = 'Bpk. ' + namaTampil;
      }

      html += `
        <tr>
          <td><small>${d.email}</small></td>
          <td class="fw-bold text-primary">${namaTampil}</td>
          <td>${d.blok}/${d.no}</td>
          <td><span class="badge ${badgeColor} p-2">${d.role.toUpperCase()}</span></td>
          <td>
            <div class="d-flex justify-content-center gap-1 align-items-center">
              ${aksiEdit}
              ${aksiHapus}
            </div>
          </td>
        </tr>`; 
    });
    document.getElementById('table-warga').innerHTML = html;
  } catch (err) {
    showLoader(false);
    alert("Gagal muat warga: " + err.message);
  }
}

function bukaEditWarga(id_user) {
  const u = globalWargaData.find(x => x.id === id_user);
  if(!u) return;

  document.getElementById('edId').value = u.id;
  document.getElementById('edEmail').value = u.email; 
  
  let namaAsli = u.nama || '';
  let panggilan = 'Bpk.';
  if(namaAsli.startsWith('Bpk. ')) { panggilan = 'Bpk.'; namaAsli = namaAsli.substring(5); }
  else if(namaAsli.startsWith('Ibu. ')) { panggilan = 'Ibu.'; namaAsli = namaAsli.substring(5); }
  
  document.getElementById('edPanggilan').value = panggilan;
  document.getElementById('edNama').value = namaAsli;
  
  let userBlok = u.blok || 'AMC 1';
  if(userBlok !== 'AMC 1' && userBlok !== 'AMC 2') userBlok = 'AMC 1';
  document.getElementById('edBlok').value = userBlok;
  
  document.getElementById('edNo').value = u.no;
  document.getElementById('edWa').value = u.wa;
  document.getElementById('edRole').value = u.role;
  document.getElementById('edPass').value = '';
  
  document.getElementById('edRole').disabled = (currentUser.role === 'admin'); 
  new bootstrap.Modal(document.getElementById('modalEditWarga')).show();
}

async function submitEditWarga(e) {
  e.preventDefault();
  showLoader(true);
  bootstrap.Modal.getInstance(document.getElementById('modalEditWarga')).hide();
  
  let namaLengkap = document.getElementById('edPanggilan').value + " " + document.getElementById('edNama').value.trim();

  try {
    // GANTI: google.script.run -> callGAS
    const res = await callGAS('editWarga', 
       document.getElementById('edId').value, 
       document.getElementById('edEmail').value, 
       document.getElementById('edPass').value, 
       namaLengkap, 
       document.getElementById('edBlok').value, 
       document.getElementById('edNo').value, 
       document.getElementById('edWa').value, 
       document.getElementById('edRole').value,
       currentUser.role 
    );
    showLoader(false);
    alert(res);
    loadWargaData();
  } catch (err) {
    showLoader(false);
    alert(err.message);
  }
}

async function handleTambahWarga(e) {
  e.preventDefault();
  showLoader(true);
  bootstrap.Modal.getInstance(document.getElementById('modalTambahWarga')).hide();
  
  let namaLengkap = document.getElementById('nwPanggilan').value + " " + document.getElementById('nwNama').value.trim();

  try {
    // GANTI: google.script.run -> callGAS
    const res = await callGAS('simpanWargaBaru',
      document.getElementById('nwEmail').value, 
      document.getElementById('nwPass').value, 
      namaLengkap, 
      document.getElementById('nwBlok').value, 
      document.getElementById('nwNo').value, 
      document.getElementById('nwWa').value, 
      currentUser.role
    );
    showLoader(false);
    alert(res.message || res);
    loadWargaData();
  } catch (err) {
    showLoader(false);
    alert(err.message);
  }
}

async function handleHapusWarga(id_user) {
  if(!confirm("Hapus warga ini? Data & riwayat akan hilang!")) return;
  showLoader(true);
  try {
    const res = await callGAS('hapusWarga', id_user, currentUser.role);
    showLoader(false);
    alert(res);
    loadWargaData();
  } catch (err) {
    showLoader(false);
    alert(err.message);
  }
}

async function handleSimpanPengaturan(e) {
  e.preventDefault();
  showLoader(true); 
  const nominal = document.getElementById('settingBiaya').value;
  const pengumuman = document.getElementById('settingPengumuman').value;
  try {
    const res = await callGAS('simpanPengaturan', nominal, pengumuman);
    showLoader(false);
    alert(res); 
    globalBiaya = parseInt(nominal); 
    globalPengumuman = pengumuman; 
  } catch (err) {
    showLoader(false);
    alert(err.message);
  }
}

async function eksekusiResetTotal() {
  if (currentUser.role !== 'superadmin') {
    alert("Akses Ditolak: Hanya Superadmin yang berhak mereset pembayaran!");
    return;
  }
  if (confirm("HAPUS SEMUA data tagihan?")) {
    if (confirm("YAKIN? Aksi tidak bisa dibatalkan!")) {
      showLoader(true);
      try {
        const res = await callGAS('resetSemuaDataPembayaran', currentUser.role);
        showLoader(false);
        alert(res);
        loadDashboardData();
      } catch (err) {
        showLoader(false);
        alert("Error: " + err.message);
      }
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('login-page').style.display = 'flex';
  document.getElementById('app-page').style.display = 'none';
  document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
  document.getElementById('profileForm')?.addEventListener('submit', handleUpdateProfil);
  document.getElementById('modalBayar')?.addEventListener('change', hitungTotalBayar);
});
