// ================================
// Supabaseの接続設定
// ================================

const SUPABASE_URL = "https://feyffrvldqcbeobhdota.supabase.co";

const SUPABASE_KEY = "sb_publishable_l2eEQD4H_f1azruzPUpMtA_djcnnOq6";

const supabaseClient =
  supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


let html5QrCode = null;
let barcodeRead = false;

// 今どの本を編集中なのか覚えておく
let editingIndex = null;


// =====================================
// バーコード登録画面を開く
// =====================================

function showRegisterForm() {

  document
    .getElementById("register-form")
    .style.display = "block";

  startBarcodeScanner();
}


// =====================================
// カメラを起動
// =====================================

async function startBarcodeScanner() {

  barcodeRead = false;

  try {

    html5QrCode =
      new Html5Qrcode("reader");

    const cameras =
      await Html5Qrcode.getCameras();


    if (cameras.length === 0) {

      alert(
        "カメラが見つかりませんでした。"
      );

      return;
    }


    await html5QrCode.start(

      {
        facingMode: "environment"
      },

      {
        fps: 10,

        qrbox: {
          width: 250,
          height: 120
        }
      },


      async function(decodedText) {

        if (barcodeRead) {
          return;
        }


        barcodeRead = true;


        document
          .getElementById("isbn")
          .value = decodedText;


        try {

          await html5QrCode.stop();

        } catch (error) {

          console.error(error);

        }


      const {
  data: existingManga,
  error: checkError
} =
  await supabaseClient
    .from("volumes")
    .select("title, volume")
    .eq("isbn", decodedText)
    .maybeSingle();


if (checkError) {

  console.error(checkError);

  alert(
    "登録済みデータの確認に失敗しました。\n\n" +
    checkError.message
  );

  return;
}


if (existingManga) {

  alert(
    "📚 この漫画はすでに登録されています！\n\n" +
    existingManga.title +
    " " +
    existingManga.volume +
    "巻"
  );

  return;
}

        await getBookInfo();

      },


      function(errorMessage) {

        // 読み取り途中のエラーは
        // 何もしなくてOK

      }

    );


  } catch (error) {

    console.error(error);

    alert(
      "カメラを起動できませんでした。"
    );

  }

}


// =====================================
// 新規登録用の表紙をプレビュー
// =====================================

function previewCover() {

  const fileInput =
    document.getElementById(
      "cover-file"
    );


  const coverImage =
    document.getElementById(
      "cover-image"
    );


  const file =
    fileInput.files[0];


  if (!file) {
    return;
  }


  const reader =
    new FileReader();


  reader.onload =
    function(event) {

      coverImage.src =
        event.target.result;

      coverImage.style.display =
        "inline-block";

    };


  reader.readAsDataURL(file);

}


// =====================================
// ISBNから本の情報を取得
// =====================================

async function getBookInfo() {

  const isbn =
    document
      .getElementById("isbn")
      .value
      .trim();


  if (isbn === "") {

    alert(
      "ISBNを入力してください！"
    );

    return;
  }


  // 前の本の情報を消す
  document
    .getElementById("title")
    .value = "";

  document
    .getElementById("volume")
    .value = "";


  const coverImage =
    document.getElementById(
      "cover-image"
    );


  coverImage.src = "";
  coverImage.style.display = "none";


  document
    .getElementById("cover-file")
    .value = "";


  try {

    const response =
      await fetch(
        "https://api.openbd.jp/v1/get?isbn=" +
        isbn
      );


    const data =
      await response.json();


    if (!data[0]) {

      alert(
        "このISBNの本は見つかりませんでした。タイトル・巻数・表紙を手動で入力してください。"
      );

      return;
    }


    const book =
      data[0].summary;


    const originalTitle =
      book.title;


    const volumeMatch =
      originalTitle.match(
        /(?:第\s*)?(\d+)(?:\s*巻)?\s*$/
      );


    let mangaTitle =
      originalTitle;


    if (volumeMatch) {

      const volumeNumber =
        volumeMatch[1];


      document
        .getElementById("volume")
        .value = volumeNumber;


      mangaTitle =
        originalTitle
          .replace(
            /(?:第\s*)?\d+(?:\s*巻)?\s*$/,
            ""
          )
          .trim();


      mangaTitle =
        mangaTitle
          .replace(
            /[\s　・:：\-]+$/,
            ""
          )
          .trim();

    }


    document
      .getElementById("title")
      .value = mangaTitle;


    if (book.cover) {

      coverImage.src =
        book.cover;

      coverImage.style.display =
        "inline-block";


      alert(
        "未登録の本です！タイトル・巻数・表紙を自動取得しました。"
      );

    } else {

      alert(
        "未登録の本です！タイトルと巻数を自動取得しました。表紙画像を選んでください。"
      );

    }


  } catch (error) {

    console.error(error);

    alert(
      "本の情報を取得できませんでした。"
    );

  }

}


// =====================================
// 漫画を新規登録
// =====================================

async function registerManga() {

  const title =
    document
      .getElementById("title")
      .value
      .trim();


  const volume =
    document
      .getElementById("volume")
      .value;


  const isbn =
    document
      .getElementById("isbn")
      .value
      .trim();


  const coverImage =
    document.getElementById(
      "cover-image"
    );


  const coverFileInput =
    document.getElementById(
      "cover-file"
    );


  if (
    title === "" ||
    volume === "" ||
    isbn === ""
  ) {

    alert(
      "タイトル・巻数・ISBNをすべて入力してください！"
    );

    return;
  }


  if (
    coverImage.src === "" ||
    coverImage.style.display === "none"
  ) {

    alert(
      "表紙画像を選んでください！"
    );

    return;
  }


  // =====================================
  // 同じISBNが登録済みか確認
  // =====================================

  const {
    data: duplicateData,
    error: duplicateError
  } =
    await supabaseClient
      .from("volumes")
      .select("id, title, volume")
      .eq("isbn", isbn);


  if (duplicateError) {

    console.error(
      duplicateError
    );

    alert(
      "登録済みデータの確認に失敗しました。\n\n" +
      duplicateError.message
    );

    return;
  }


  if (
    duplicateData &&
    duplicateData.length > 0
  ) {

    const existingManga =
      duplicateData[0];


    alert(
      "📚 この漫画はすでに登録されています！\n\n" +
      existingManga.title +
      " " +
      existingManga.volume +
      "巻"
    );

    return;
  }


  // =====================================
  // 表紙画像のURLを準備
  // =====================================

  let coverUrl =
    coverImage.src;


  const coverFile =
    coverFileInput.files[0];


  // 自分で画像を選んだ場合だけ
  // Supabase Storageへアップロードする
  if (coverFile) {

    const fileExtension =
      coverFile.name
        .split(".")
        .pop();


    const fileName =
      isbn +
      "-" +
      Date.now() +
      "." +
      fileExtension;


    const {
      error: uploadError
    } =
      await supabaseClient
        .storage
        .from("covers")
        .upload(
          fileName,
          coverFile
        );


    if (uploadError) {

      console.error(
        uploadError
      );

      alert(
        "表紙画像のアップロードに失敗しました。\n\n" +
        uploadError.message
      );

      return;
    }


    // アップロードした画像の公開URLを取得
    const {
      data: publicUrlData
    } =
      supabaseClient
        .storage
        .from("covers")
        .getPublicUrl(
          fileName
        );


    coverUrl =
      publicUrlData.publicUrl;

  }


  // =====================================
  // 漫画データをSupabaseへ登録
  // =====================================

  const { error } =
    await supabaseClient
      .from("volumes")
      .insert({
        title: title,
        volume: Number(volume),
        isbn: isbn,
        cover_url: coverUrl
      });


  if (error) {

    console.error(error);

    alert(
      "Supabaseへの登録に失敗しました。\n\n" +
      error.message
    );

    return;
  }


  // 最新の漫画一覧を表示
  await loadManga();


  alert(
    "漫画を登録しました！"
  );

}


// =====================================
// 漫画一覧を表示
// =====================================

async function loadManga() {

  const { data, error } =
    await supabaseClient
      .from("volumes")
      .select("*")
      .order("registered_at", {
        ascending: true
      });


  const mangaList =
    document.getElementById(
      "manga-list"
    );


  if (error) {

    console.error(error);

    mangaList.innerHTML =
      "<p>漫画データを読み込めませんでした。</p>";

    return;
  }


  const savedManga = data || [];


  if (savedManga.length === 0) {

    mangaList.innerHTML =
      "<p>まだ漫画が登録されていません。</p>";

    return;
  }


  const groupedManga = {};


  savedManga.forEach(
    function(manga, index) {

      if (!groupedManga[manga.title]) {

        groupedManga[manga.title] = {

          title: manga.title,

          volumes: [],

          cover: manga.cover_url,

          lastRegisteredVolume:
            manga.volume,

          lastIndex: index

        };

      }


      groupedManga[manga.title]
        .volumes
        .push(
          String(manga.volume)
        );


      if (
        index >
        groupedManga[manga.title]
          .lastIndex
      ) {

        groupedManga[manga.title]
          .lastRegisteredVolume =
          manga.volume;


        groupedManga[manga.title]
          .cover =
          manga.cover_url;


        groupedManga[manga.title]
          .lastIndex =
          index;

      }

    }
  );


  mangaList.innerHTML = "";


  Object.values(groupedManga)
    .forEach(
      function(manga) {

        // 同じ巻数は1回だけ表示
        manga.volumes =
          [...new Set(manga.volumes)];


        // 巻数を数字順に並べる
        manga.volumes.sort(
          function(a, b) {

            return Number(a) - Number(b);

          }
        );


        let coverHtml = "";


        if (manga.cover) {

          coverHtml = `
            <img
              src="${manga.cover}"
              alt="${manga.title}の表紙"
              style="
                width: 100px;
                max-height: 150px;
                object-fit: cover;
                border-radius: 6px;
              "
            >
          `;

        }


        mangaList.innerHTML += `

          <div>

            ${coverHtml}

            <h3>
              ${manga.title}
            </h3>

            <p>
              所有巻：
              ${manga.volumes.join("・")}巻
            </p>

            <p>
              <strong>
                最後に登録：
                ${manga.lastRegisteredVolume}巻
              </strong>
            </p>


            <button
              class="edit-button"
              onclick='showEditArea(${JSON.stringify(manga.title)})'
            >
              ✏️ 登録内容を編集
            </button>

          </div>

        `;

      }
    );

}

// =====================================
// 作品ごとの登録内容を表示
// =====================================

async function showEditArea(title) {

  const { data, error } =
    await supabaseClient
      .from("volumes")
      .select("*")
      .eq("title", title)
      .order("volume", {
        ascending: true
      });


  if (error) {

    console.error(error);

    alert(
      "登録内容を読み込めませんでした。\n\n" +
      error.message
    );

    return;
  }


  const savedManga =
    data || [];


  document
    .getElementById("edit-title")
    .textContent =
    "「" + title + "」の登録内容";


  const editVolumeList =
    document.getElementById(
      "edit-volume-list"
    );


  editVolumeList.innerHTML = "";


  savedManga.forEach(
    function(manga) {

      editVolumeList.innerHTML += `

        <div
          style="
            padding: 15px 0;
            border-bottom: 1px solid #ddd;
          "
        >

          <h3>
            ${manga.volume}巻
          </h3>

          <p>
            ISBN：${manga.isbn}
          </p>


          <button
            type="button"
            onclick="openBookEdit(${manga.id})"
          >
            ✏️ 編集
          </button>


          <button
            type="button"
            onclick="deleteManga(${manga.id})"
          >
            🗑️ 削除
          </button>

        </div>

      `;

    }
  );


  const editArea =
    document.getElementById(
      "edit-area"
    );


  editArea.style.display =
    "block";


  editArea.scrollIntoView({
    behavior: "smooth"
  });

}

// =====================================
// 1冊の編集フォームを開く
// =====================================

async function openBookEdit(id) {

  const { data, error } =
    await supabaseClient
      .from("volumes")
      .select("*")
      .eq("id", id)
      .single();


  if (error) {

    console.error(error);

    alert(
      "編集するデータを読み込めませんでした。\n\n" +
      error.message
    );

    return;
  }


  const manga = data;


  // どの本を編集中かIDで覚える
  editingIndex = id;


  document
    .getElementById(
      "edit-book-title"
    )
    .value = manga.title;


  document
    .getElementById(
      "edit-book-volume"
    )
    .value = manga.volume;


  document
    .getElementById(
      "edit-book-isbn"
    )
    .value = manga.isbn;


  const cover =
    document.getElementById(
      "edit-book-cover"
    );


  if (manga.cover_url) {

    cover.src =
      manga.cover_url;

    cover.style.display =
      "inline-block";

  } else {

    cover.src = "";

    cover.style.display =
      "none";

  }


  // 前に選んだ画像をリセット
  document
    .getElementById(
      "edit-cover-file"
    )
    .value = "";


  // 保存ボタンを使えるようにする
  document
    .getElementById(
      "save-edit-button"
    )
    .disabled = false;


  const form =
    document.getElementById(
      "book-edit-form"
    );


  form.style.display =
    "block";


  form.scrollIntoView({
    behavior: "smooth"
  });

}


// =====================================
// 編集用の表紙を選んだとき
// =====================================

function previewEditCover() {

  const fileInput =
    document.getElementById(
      "edit-cover-file"
    );


  const file =
    fileInput.files[0];


  if (!file) {
    return;
  }


  const reader =
    new FileReader();


  reader.onload =
    function(event) {

      const cover =
        document.getElementById(
          "edit-book-cover"
        );


      cover.src =
        event.target.result;


      cover.style.display =
        "inline-block";

    };


  reader.readAsDataURL(file);

}


// =====================================
// 編集した内容を保存
// =====================================

async function saveBookEdit() {

  if (editingIndex === null) {

    alert(
      "編集する本が選ばれていません。"
    );

    return;
  }


  const id = editingIndex;


  const newTitle =
    document
      .getElementById(
        "edit-book-title"
      )
      .value
      .trim();


  const newVolume =
    document
      .getElementById(
        "edit-book-volume"
      )
      .value;


  const newIsbn =
    document
      .getElementById(
        "edit-book-isbn"
      )
      .value
      .trim();


  const cover =
    document.getElementById(
      "edit-book-cover"
    );


  const coverFileInput =
    document.getElementById(
      "edit-cover-file"
    );


  if (
    newTitle === "" ||
    newVolume === "" ||
    newIsbn === ""
  ) {

    alert(
      "タイトル・巻数・ISBNをすべて入力してください！"
    );

    return;
  }


  // =====================================
  // 現在のデータを取得
  // =====================================

  const {
    data: currentManga,
    error: currentError
  } =
    await supabaseClient
      .from("volumes")
      .select("*")
      .eq("id", id)
      .single();


  if (currentError) {

    console.error(
      currentError
    );

    alert(
      "現在のデータを読み込めませんでした。\n\n" +
      currentError.message
    );

    return;
  }


  // =====================================
  // ISBNの重複チェック
  // =====================================

  const {
    data: duplicateData,
    error: duplicateError
  } =
    await supabaseClient
      .from("volumes")
      .select("id")
      .eq("isbn", newIsbn)
      .neq("id", id);


  if (duplicateError) {

    console.error(
      duplicateError
    );

    alert(
      "ISBNの確認に失敗しました。\n\n" +
      duplicateError.message
    );

    return;
  }


  if (
    duplicateData &&
    duplicateData.length > 0
  ) {

    alert(
      "このISBNは別の登録ですでに使われています！"
    );

    return;
  }


  // =====================================
  // 表紙画像を準備
  // =====================================

  let newCoverUrl =
    currentManga.cover_url;


  const newCoverFile =
    coverFileInput.files[0];


  if (newCoverFile) {

    const fileExtension =
      newCoverFile.name
        .split(".")
        .pop();


    const fileName =
      newIsbn +
      "-" +
      Date.now() +
      "." +
      fileExtension;


    const {
      error: uploadError
    } =
      await supabaseClient
        .storage
        .from("covers")
        .upload(
          fileName,
          newCoverFile
        );


    if (uploadError) {

      console.error(
        uploadError
      );

      alert(
        "新しい表紙画像のアップロードに失敗しました。\n\n" +
        uploadError.message
      );

      return;
    }


    const {
      data: publicUrlData
    } =
      supabaseClient
        .storage
        .from("covers")
        .getPublicUrl(
          fileName
        );


    newCoverUrl =
      publicUrlData.publicUrl;

  }


  // =====================================
  // 漫画データを更新
  // =====================================

  const { error } =
    await supabaseClient
      .from("volumes")
      .update({
        title: newTitle,
        volume: Number(newVolume),
        isbn: newIsbn,
        cover_url: newCoverUrl
      })
      .eq("id", id);


  if (error) {

    console.error(error);

    alert(
      "変更の保存に失敗しました。\n\n" +
      error.message
    );

    return;
  }


  // =====================================
  // 古いStorage画像を削除
  // =====================================

  const storageMarker =
    "/storage/v1/object/public/covers/";


  if (
    newCoverFile &&
    currentManga.cover_url &&
    currentManga.cover_url.includes(
      storageMarker
    )
  ) {

    const oldFileName =
      currentManga.cover_url
        .split(storageMarker)[1];


    const {
      error: deleteCoverError
    } =
      await supabaseClient
        .storage
        .from("covers")
        .remove([
          oldFileName
        ]);


    if (deleteCoverError) {

      console.error(
        deleteCoverError
      );

    }

  }


  // 一覧を更新
  await loadManga();


  // 編集フォームを閉じる
  closeBookEdit();


  // 編集一覧も更新
  await showEditArea(
    newTitle
  );


  alert(
    "変更を保存しました！"
  );

}

// =====================================
// 1冊の編集フォームを閉じる
// =====================================

function closeBookEdit() {

  editingIndex = null;


  document
    .getElementById(
      "book-edit-form"
    )
    .style.display = "none";


  document
    .getElementById(
      "save-edit-button"
    )
    .disabled = true;

}


// =====================================
// 漫画を1件削除
// =====================================

async function deleteManga(id) {

  // まず削除する本の情報を取得
  const {
    data: manga,
    error: readError
  } =
    await supabaseClient
      .from("volumes")
      .select("*")
      .eq("id", id)
      .single();


  if (readError) {

    console.error(readError);

    alert(
      "削除するデータを読み込めませんでした。\n\n" +
      readError.message
    );

    return;
  }


  const result =
    confirm(
      "「" +
      manga.title +
      " " +
      manga.volume +
      "巻」を削除しますか？"
    );


  if (!result) {
    return;
  }


  const title =
    manga.title;


  // =====================================
  // Storageに保存した表紙なら削除
  // =====================================

  const storageMarker =
    "/storage/v1/object/public/covers/";


  if (
    manga.cover_url &&
    manga.cover_url.includes(
      storageMarker
    )
  ) {

    const fileName =
      manga.cover_url
        .split(storageMarker)[1];


    const {
      error: storageError
    } =
      await supabaseClient
        .storage
        .from("covers")
        .remove([
          fileName
        ]);


    if (storageError) {

      console.error(
        storageError
      );

      alert(
        "表紙画像の削除に失敗しました。\n\n" +
        storageError.message
      );

      return;
    }

  }


  // =====================================
  // 漫画データをSupabaseから削除
  // =====================================

  const { error } =
    await supabaseClient
      .from("volumes")
      .delete()
      .eq("id", id);


  if (error) {

    console.error(error);

    alert(
      "削除に失敗しました。\n\n" +
      error.message
    );

    return;
  }


  // 漫画一覧を更新
  await loadManga();


  // 同じタイトルの本がまだ残っているか確認
  const {
    data: remainingData,
    error: remainingError
  } =
    await supabaseClient
      .from("volumes")
      .select("id")
      .eq("title", title);


  if (remainingError) {

    console.error(
      remainingError
    );

    alert(
      "削除後の確認に失敗しました。\n\n" +
      remainingError.message
    );

    return;
  }


  if (
    remainingData &&
    remainingData.length > 0
  ) {

    await showEditArea(
      title
    );

  } else {

    document
      .getElementById(
        "edit-area"
      )
      .style.display =
        "none";

  }


  closeBookEdit();


  alert(
    "削除しました！"
  );

}

// =====================================
// 「登録内容一覧」を閉じる
// =====================================

document
  .getElementById(
    "close-edit-button"
  )
  .addEventListener(
    "click",
    function() {

      document
        .getElementById(
          "edit-area"
        )
        .style.display = "none";


      closeBookEdit();

    }
  );


// =====================================
// 編集用の表紙画像
// =====================================

document
  .getElementById(
    "edit-cover-file"
  )
  .addEventListener(
    "change",
    previewEditCover
  );


// =====================================
// 「変更を保存」
// =====================================

document
  .getElementById(
    "save-edit-button"
  )
  .addEventListener(
    "click",
    saveBookEdit
  );


// =====================================
// 「キャンセル」
// =====================================

document
  .getElementById(
    "cancel-edit-button"
  )
  .addEventListener(
    "click",
    closeBookEdit
  );


// ページを開いたときに一覧表示
loadManga();
// =====================================
// 漫画タイトル検索
// =====================================

document
  .getElementById("search-input")
  .addEventListener(
    "input",
    function() {

      const keyword =
        this.value
          .trim()
          .toLowerCase();


      const mangaCards =
        document.querySelectorAll(
          "#manga-list > div"
        );


      mangaCards.forEach(
        function(card) {

          const title =
            card
              .querySelector("h3")
              .textContent
              .toLowerCase();


          if (
            title.includes(keyword)
          ) {

            card.style.display =
              "block";

          } else {

            card.style.display =
              "none";

          }

        }
      );

    }
  );
  // =====================================
// Supabaseログインの接続テスト
// =====================================

async function testSupabaseLogin() {

  const email =
    prompt("漫画棚のログイン用メールアドレスを入力してください");

  if (!email) {
    return;
  }


  const password =
    prompt("漫画棚のパスワードを入力してください");

  if (!password) {
    return;
  }


  const { data, error } =
    await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });


  if (error) {

    console.error(error);

    alert(
      "❌ Supabaseへのログインに失敗しました。\n\n" +
      error.message
    );

    return;
  }


  alert(
    "🎉 Supabaseへのログインに成功しました！"
  );

}


// 接続テストを実行
testSupabaseLogin();
// =====================================
// Supabaseから漫画データを読むテスト
// =====================================

async function testReadSupabase() {

  const { data, error } =
    await supabaseClient
      .from("volumes")
      .select("*");


  if (error) {

    console.error(error);

    alert(
      "❌ 漫画データを読み取れませんでした。\n\n" +
      error.message
    );

    return;
  }


  console.log(
    "Supabaseの漫画データ：",
    data
  );


  alert(
    "📚 Supabaseからの読み取りに成功しました！\n\n" +
    "登録件数：" +
    data.length +
    "件"
  );

}



// =====================================
// Supabaseへ漫画を登録するテスト
// =====================================

async function testInsertSupabase() {

  const { data, error } =
    await supabaseClient
      .from("volumes")
      .insert({
        title: "テスト漫画",
        volume: 1,
        isbn: "9780000000000",
        cover_url: ""
      })
      .select();


  if (error) {

    console.error(error);

    alert(
      "❌ Supabaseへの登録に失敗しました。\n\n" +
      error.message
    );

    return;
  }


  console.log(
    "Supabaseに登録したデータ：",
    data
  );


  alert(
    "🎉 Supabaseへの登録に成功しました！"
  );

}


