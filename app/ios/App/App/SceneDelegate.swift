import UIKit
import Capacitor
import AppTrackingTransparency

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = CAPBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    /// 앱이 처음 화면에 뜨면 바로 추적 허용을 묻는다 (광고 SDK는 웹 쪽에서 답을 받은 뒤에야 시작).
    /// 앱이 아직 완전히 활성 상태가 아니면 notDetermined로 바로 돌아오는 경우가 있어 한 번 더 묻는다.
    private var askedTracking = false
    func sceneDidBecomeActive(_ scene: UIScene) {
        guard !askedTracking else { return }
        askedTracking = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { self.askTracking(retry: true) }
    }

    private func askTracking(retry: Bool) {
        guard ATTrackingManager.trackingAuthorizationStatus == .notDetermined else { return }
        ATTrackingManager.requestTrackingAuthorization { status in
            if status == .notDetermined && retry {
                DispatchQueue.main.asyncAfter(deadline: .now() + 1) { self.askTracking(retry: false) }
            }
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
