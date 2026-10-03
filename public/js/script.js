document.addEventListener('DOMContentLoaded', async () => {
    const bookElement = document.getElementById('book');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const pageIndicator = document.getElementById('page-indicator');

    let pagesData = [];
    let currentStep = 0; // 0: Đóng sách (Bìa căn giữa), 1: Mở trang 1-2,...
    let totalSteps = 0;
    let domPages = [];

    // 1. Tải nội dung linh hoạt từ các tệp 1.txt, 2.txt, 3.txt...
    async function loadBookContent() {
        let fileIndex = 1;
        let rawFullText = "";

        while (true) {
            try {
                const response = await fetch(`public/content/${fileIndex}.txt`);
                if (!response.ok) {
                    break; // Dừng khi hết file txt
                }
                const text = await response.text();
                rawFullText += text + "\n\n";
                fileIndex++;
            } catch (error) {
                break;
            }
        }

        if (!rawFullText.trim()) {
            rawFullText = "Chưa có nội dung truyện. Vui lòng thêm các file 1.txt, 2.txt... vào thư mục public/content/";
        }

        paginateContent(rawFullText);
    }

    // 2. Thuật toán phân trang thông minh bảo toàn trọn vẹn từ (Đã fix lỗi chiều cao)
    function paginateContent(text) {
        // Tạo khung đo lường chuẩn bên trong bookElement để nhận đúng kích thước thực tế
        const testContainer = document.createElement('div');
        testContainer.className = 'page';
        testContainer.style.visibility = 'hidden';
        testContainer.style.position = 'absolute';
        testContainer.style.top = '0';
        testContainer.style.left = '0';
        testContainer.style.width = '50%';
        testContainer.style.height = '100%';

        const testFace = document.createElement('div');
        testFace.className = 'page-face';
        
        const testContentDiv = document.createElement('div');
        testContentDiv.className = 'page-content';
        
        testFace.appendChild(testContentDiv);
        testContainer.appendChild(testFace);
        bookElement.appendChild(testContainer);

        // Lấy chiều cao thực tế của khung chứa nội dung (trừ padding top/bottom)
        const maxHeight = testFace.clientHeight - 80;
        bookElement.removeChild(testContainer);

        const safeMaxHeight = maxHeight > 50 ? maxHeight : 400; // Giá trị phòng hờ an toàn

        const words = text.split(/\s+/);
        let currentChunk = "";
        pagesData = [];

        // Gắn lại khung đo lường vào DOM để kiểm tra scrollHeight trong vòng lặp
        testContainer.style.visibility = 'hidden';
        bookElement.appendChild(testContainer);

        for (let i = 0; i < words.length; i++) {
            let testChunk = currentChunk + (currentChunk ? " " : "") + words[i];
            testContentDiv.innerText = testChunk;

            if (testContentDiv.scrollHeight > safeMaxHeight) {
                pagesData.push(currentChunk);
                currentChunk = words[i];
                testContentDiv.innerText = currentChunk;
            } else {
                currentChunk = testChunk;
            }
        }
        if (currentChunk) {
            pagesData.push(currentChunk);
        }

        bookElement.removeChild(testContainer);

        // Đảm bảo số trang luôn là số chẵn để hiển thị dạng trang đôi cân đối
        if (pagesData.length % 2 !== 0) {
            pagesData.push("");
        }

        buildBookDOM();
    }

    // 3. Xây dựng cấu trúc DOM
    function buildBookDOM() {
        bookElement.innerHTML = '';
        domPages = [];

        // Tạo Bìa Sách
        const coverDiv = document.createElement('div');
        coverDiv.className = 'page cover-page';
        coverDiv.style.zIndex = pagesData.length + 10;
        coverDiv.innerHTML = `
            <div class="page-face front cover-front">
                <div class="cover-eyebrow">LBD</div>
                <div class="cover-title">OBEY 7</div>
                <div class="cover-subtitle">Sứ Giả Tận Thế</div>
            </div>
            <div class="page-face back">
                <div class="page-content" style="display:flex; align-items:center; justify-content:center; color:#999; font-style:italic;">(Mặt trong bìa)</div>
            </div>
        `;

        coverDiv.addEventListener('click', () => {
            if (currentStep === 0) flipNext();
        });

        bookElement.appendChild(coverDiv);
        domPages.push(coverDiv);

        // Tạo các trang nội dung
        for (let i = 0; i < pagesData.length; i += 2) {
            const pageDiv = document.createElement('div');
            pageDiv.className = 'page';
            pageDiv.style.zIndex = pagesData.length - i;

            pageDiv.innerHTML = `
                <div class="page-face front">
                    <div class="page-content">${pagesData[i]}</div>
                    <div class="page-number">${i + 1}</div>
                </div>
                <div class="page-face back">
                    <div class="page-content">${pagesData[i + 1]}</div>
                    <div class="page-number">${i + 2}</div>
                </div>
            `;

            pageDiv.addEventListener('click', (e) => {
                const rect = pageDiv.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                if (clickX < rect.width / 2) {
                    flipPrev();
                } else {
                    flipNext();
                }
            });

            bookElement.appendChild(pageDiv);
            domPages.push(pageDiv);
        }

        totalSteps = domPages.length;
        updateBookState();
    }

    // 4. Điều khiển mở / đóng và lật trang tinh tế
    function flipNext() {
        if (currentStep === 0) {
            bookElement.classList.remove('closed');
            setTimeout(() => {
                domPages[0].classList.add('flipped');
                domPages[0].style.zIndex = 100;
                currentStep = 1;
                updateBookState();
            }, 300);
        } else if (currentStep < totalSteps) {
            const currentDom = domPages[currentStep];
            currentDom.classList.add('flipped');
            currentDom.style.zIndex = currentStep + 100;
            currentStep++;
            updateBookState();
        }
    }

    function flipPrev() {
        if (currentStep === 1) {
            domPages[0].classList.remove('flipped');
            domPages[0].style.zIndex = pagesData.length + 10;
            currentStep = 0;
            updateBookState();
            setTimeout(() => {
                bookElement.classList.add('closed');
            }, 400);
        } else if (currentStep > 1) {
            currentStep--;
            const currentDom = domPages[currentStep];
            currentDom.classList.remove('flipped');
            currentDom.style.zIndex = pagesData.length - (currentStep * 2 - 2);
            updateBookState();
        }
    }

    function updateBookState() {
        if (currentStep === 0) {
            pageIndicator.innerText = "Bìa sách (Đã đóng)";
        } else {
            let startPage = (currentStep - 1) * 2 + 1;
            let endPage = Math.min(startPage + 1, pagesData.length);
            pageIndicator.innerText = `Trang ${startPage} - ${endPage} / ${pagesData.length}`;
        }
    }

    nextBtn.addEventListener('click', flipNext);
    prevBtn.addEventListener('click', flipPrev);

    // 5. Hỗ trợ vuốt trên điện thoại
    let touchStartX = 0;
    let touchEndX = 0;

    bookElement.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    bookElement.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        if (touchEndX < touchStartX - 50) {
            flipNext();
        } else if (touchEndX > touchStartX + 50) {
            flipPrev();
        }
    }, { passive: true });

    loadBookContent();
});