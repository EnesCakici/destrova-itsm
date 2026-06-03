Destrova Frontend – Backend iyileştirmesi gereken noktalar 

 

Customer Ekranları 

Frontend: 

Customer my tickets sayfasındaki filtreler kısmına statüye göre filtreleme özelliği eklenmeli. Ancak müşteride statüler new inprogress waiting for cursomer resolved gibi isimlerle değil şu isimlerle adlandırılıyor:  

Request received 

Our team is reviewing 

Awaiting your response 

Solution provided 

Closed 

filtreyi buna göre ekleyelim, tarza uygun bir şekilde yapalım. 

Müşterinin ticket’ı her durumda kapatabilmesini sağlayan bir buton ekleyelim CustomerTicketDetailView.jsx sayfasına. Tasarım diline uygun bir biçimde olsun. Halihazırda manager ticket ı kapatabiliyor CLOSURE REASON ekleyerek, tabii dil olarak düzeltilmiş hali customer ekranına eklenmeli, profesyonel sistemlerde nasıl oluyorsa o şekilde. Backend kısmı hazır değil müşteri için. Bunu da ayarlayacağız. 

Backend: 

Müşterinin ticket’ı her durumda kapatabilmesini sağlayan altyapıyı yapalım. Eksiklikleri Tespit et, adım adım hatasız yapalım. 

 

Agent Ekranları 

Backend – Frontend: 

 Ticket atama, devir, iş yükü limiti- burdaki devir sistemi, agentta devredebilmeli bizim sistemimizde yalnızca manager yapıyor bu işi, halihazırdaki sistemlere bakmamız lazım . Agent Tek Ticket Devir özelliği ekleyelim, bu agent ekranlarında sağ panelde olsun, şu şekilde yazmıştık daha öncesinde uygulamadık. uygun mu teyitle: Devir sırasında devir nedeni seçilir (izin, iş yükü, uzmanlık alanı, bilgi eksikliği vb.) ve açıklama yazılabilir. ---buna bakalım, bu yok sanırım 

 

Görev: Tek ticket devri özelliği ekle. 

 

Dosya 1 (yeni): backend/src/main/java/com/ticket/backend/dto/TransferTicketRequest.java 

  @Data @NoArgsConstructor @AllArgsConstructor @Builder 

  private Long toAgentId;   // zorunlu 

  private String transferReason;  // zorunlu: VACATION, OVERLOAD, EXPERTISE, KNOWLEDGE_GAP 

  private String transferNote;    // opsiyonel 

 

Dosya 2: @TicketController.java 

  Eklenecek endpoint: 

  @PostMapping("/{id}/transfer") 

  @PreAuthorize("hasAnyRole('AGENT', 'MANAGER', 'ADMIN')") 

  ResponseEntity<Ticket> transferTicket(@PathVariable Long id, @RequestBody TransferTicketRequest req, Authentication auth): 

    return ResponseEntity.ok(ticketService.transferTicket(id, req, auth)) 

 

Dosya 3: @TicketService.java 

  Eklenecek metot (sınıfın sonuna, deleteTicket metodundan önce): 

 

  public Ticket transferTicket(Long ticketId, TransferTicketRequest request, Authentication auth) { 

    Ticket ticket = ticketRepository.findById(ticketId) 

        .orElseThrow(() -> new EntityNotFoundException("Ticket not found: " + ticketId)); 

     

    if (request.getToAgentId() == null) throw new IllegalArgumentException("toAgentId zorunludur."); 

    if (request.getTransferReason() == null) throw new IllegalArgumentException("transferReason zorunludur."); 

     

    // Agent sadece kendi ticket'ını devredebilir 

    if (isAgentOnly(auth)) { 

        Long uid = appUserService.requireUserId(auth); 

        if (!uid.equals(ticket.getAssigneeId())) throw new AccessDeniedException("Sadece size atanmış ticket'ı devredebilirsiniz."); 

    } 

     

    Long previousAssigneeId = ticket.getAssigneeId(); 

    assignWithLimitCheck(ticket, request.getToAgentId()); 

    Ticket saved = ticketRepository.save(ticket); 

     

    String agentName = userRepository.findById(request.getToAgentId()).map(User::getName).orElse("Agent #" + request.getToAgentId()); 

    String comment = "Ticket transferred to " + agentName + ". Reason: " + request.getTransferReason(); 

    if (request.getTransferNote() != null && !request.getTransferNote().isBlank()) { 

        comment += " — " + request.getTransferNote().trim(); 

    } 

    saveSystemComment(saved, comment); 

    notificationService.notifyTicketTransferred(saved.getId(), request.getToAgentId()); 

    return hydrateTicketDisplayNames(saved); 

  } 

 

Kural: Sadece belirtilen 3 dosya değişecek. Mevcut transferAllTickets metoduna dokunma. 

``` 

 

He bir de ekip tarzı bir olay yapmamız gerekiyormuş, nasıl ekip dediğim olay şu: agentlar tüm açık ticketları görüyor ya onu şu şekilde düzenleyeceğiz, ürün bazlı agentlar olacak, yani 1. ürünle ilgilenen agentlar , 2. ürünle ilgilienen agentlar , 1.4.5. ürünle ilgilenen agentlar gibi. Bunu düzenleyebilmeliyiz, ekleme silme vs vs. Bunu hangi role verelim nasıl geliştirelim düşünelim, mention sistemini buna göre geliştirelim. Sanırım manager atayacak şu ürünle ilgilenene agentlar şunlardır gibi, sonrasında düzenlenebilir olmalı, vs. Bu sistemi geliştir hocam. Uygulamalıyız.  

 

Mention sisteminde sadece internal mesaj yazmasına izin veriyoruz ya bu halihazıradki sistemlerde nasıl oluyor bi bakalım, tam erişim gerekiyorsa ki bence gerekiyor sistemi biraz esnetelim düşünelim 

 

 

 

Ticket kapatma nedenleri – bu da manager tarafında var ama agent tarafında yok, resolved olunca müşteriye gidiyor müşteri onaylarsa closed oluyo, ama diğerleri yok kapatma nedeni seçme diye bi olay yok şu anki sistemde 

 

 

 

4.2.1.2. Ticket Atama ve İş Yükü Yönetimi Limit aşıldığında yeni ticket alamaz, uyarı mesajı gösterilir.--uyarı mesajı ne durumda,bilmiyorum 

Worklog ekranlarında Recent activity kısmı belli sayıda göstersin, sayfa çok aşağı kaymasın, içeriye bir scrollbar eklenebilir. 

Time distribution kısmında Reply0%Internal0% Worklog, böyle çubuklar var, ve boş. Bunun olması gerekiyor mu? Düzenlenme geçsek ne dersin? 

Activity overview kısmında All products var, diğer ürünler listelenmiyor, ilgilendiği ürünler listelenemli, seçilebilmeli 

 

 

 

Common Ekranlar 

Frontend: 

Giriş sayfası çalışıyor ancak keycloak görünümünde, bu modernize edilerek düzenlenmeli 

Bildirim paneli tarzını düzenleyelim, halihazırda çalışıyor sorun yok, tarz olarak düzenlemeliyiz 

Backend 

Attachment validasyonu yapmalıyız, içerik olarak büyüklük olarak vs. Kelime içeriği olarak vs de yapılmalı. Şunu yazmışız uygulamamışız tabii, birbak bakalım uygun mudur? 4.1.3. Dosya Yükleme  Desteklenen dosya türleri: .jpg, .png, .pdf, .txt, .log, .zip  Maksimum yükleme limiti: Bir ticket için en fazla 5 dosya ve toplamda maksimum 10 MB olacak şekilde kısıtlanmıştır.  Dosyalar ticket'a eklenir ve ticket detayında görüntülenebilir. .jpg, .png, .pdf, .txt, .log, .zip en fazla 5 dosya ve toplamda maksimum 10 MB  Dosya validasyonu  

 

Görev: Attachment upload endpoint'ine validasyon ekle. 

 

Dosya 1: @TicketController.java 

  POST /api/tickets/{id}/attachments endpoint'inin BAŞINA şu kontrolleri ekle: 

 

  // 1. Uzantı kontrolü 

  String originalFilename = file.getOriginalFilename(); 

  if (originalFilename == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dosya adı okunamadı."); 

  String ext = originalFilename.toLowerCase(); 

  List<String> allowed = List.of(".jpg", ".jpeg", ".png", ".pdf", ".txt", ".log", ".zip", ".doc", ".docx"); 

  boolean validExt = allowed.stream().anyMatch(ext::endsWith); 

  if (!validExt) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bu dosya türüne izin verilmiyor. İzin verilen: jpg, jpeg, png, pdf, txt, log, zip, doc, docx"); 

 

  // 2. Boyut kontrolü 

  if (file.getSize() > 10L * 1024 * 1024) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dosya boyutu 10MB'ı aşamaz."); 

 

  // 3. Sayı kontrolü 

  long count = attachmentRepository.countByTicketId(id); 

  if (count >= 5) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bir ticket'a en fazla 5 dosya eklenebilir."); 

 

Dosya 2 (gerekirse): @AttachmentRepository.java 

  Eğer countByTicketId(Long ticketId) metodu yoksa ekle: 

  long countByTicketId(Long ticketId); 

 

Kural: Sadece TicketController.java ve (gerekirse) AttachmentRepository.java değişecek. 

``` 

 

Bizim giriş ekranlarında Keycloak ile kimlik doğrulama ve yetkilendirme (RBAC, SSO, 2FA) burdaki sso 2fa dediği olay yok bizde yapmamız lazım 

 

 

Admin Ekranları 

Kullanıcı yönetimi admin panelinde olması gerekiyormuş, keycloak sayfasında değil, yeni kullanıcı ekleme olayı, rol muhabbeti, aktif pasif falan 

 

Manager Ekranları 

Yukarda anlatmış olduğum ekip bazlı sisetmi manager kontrol edecek. Ekip oluşturabilecek, o ekibe kişileri dahil edebilecek, ürün bazlı çalışacak bunlar. Buraya eklenen agentlar da ordaki ürünlerle ilgili ticketları görebilecekler, ilgilenebilecekler. Diğerleri unassgned olsa bile başka ürünse o ekipten değilse göremeyecek. 

 

 

 

 

 