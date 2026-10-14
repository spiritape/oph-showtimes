import UniformTypeIdentifiers
import UserNotifications

/// Attaches the New Title's poster to the notification before iOS shows it.
/// If the download fails or runs out of time, the notification shows without one.
final class NotificationService: UNNotificationServiceExtension, @unchecked Sendable {
    private var contentHandler: ((UNNotificationContent) -> Void)?
    private var content: UNMutableNotificationContent?

    override func didReceive(
        _ request: UNNotificationRequest,
        withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        self.contentHandler = contentHandler
        content = request.content.mutableCopy() as? UNMutableNotificationContent
        guard let link = request.content.userInfo["imageUrl"] as? String, let url = URL(string: link) else {
            return finish()
        }
        Task {
            if let attachment = await Self.attachment(from: url) {
                content?.attachments = [attachment]
            }
            finish()
        }
    }

    override func serviceExtensionTimeWillExpire() {
        finish()
    }

    private func finish() {
        guard let contentHandler, let content else { return }
        self.contentHandler = nil
        contentHandler(content)
    }

    private static func attachment(from url: URL) async -> UNNotificationAttachment? {
        guard let (download, response) = try? await URLSession.shared.download(from: url),
              let type = response.mimeType.flatMap({ UTType(mimeType: $0) }),
              type.conforms(to: .image),
              let ext = type.preferredFilenameExtension
        else { return nil }
        // iOS works out the image type from the file's extension.
        let file = FileManager.default.temporaryDirectory.appending(path: "\(UUID().uuidString).\(ext)")
        guard (try? FileManager.default.moveItem(at: download, to: file)) != nil else { return nil }
        return try? UNNotificationAttachment(identifier: "poster", url: file)
    }
}
