import com.crystalpower.website.service.UploadScanner;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.ServerSocket;
import java.net.InetAddress;
import java.io.DataInputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/** Explicit loopback QA only. Uses the real application scanner and a real clamd. */
class VerifyLiveUploadScanner {
    public static void main(String[] args) throws Exception {
        if (args.length == 0 || args.length > 2 || !args[0].equals("13310")
                || (args.length == 2 && !List.of("--unavailable", "--stalled").contains(args[1])))
            throw new IllegalArgumentException("Use the dedicated local QA clamd port 13310.");
        var checks = new ArrayList<String>();
        var scanner = new UploadScanner(true, "127.0.0.1", 13310);
        byte[] clean = "Crystal Powers disposable scanner acceptance fixture.".getBytes(StandardCharsets.US_ASCII);
        if (args.length == 2 && args[1].equals("--stalled")) {
            stalled(scanner, clean, checks);
        } else if (args.length == 2 && args[1].equals("--unavailable")) {
            require("Unavailable trusted scanner fails closed", scanner.scan(clean).equals("ERROR"), checks);
        } else {
            try (var socket = new Socket()) {
                socket.connect(new InetSocketAddress("127.0.0.1", 13310), 3000);
                socket.setSoTimeout(5000);
                socket.getOutputStream().write("zVERSION\0".getBytes(StandardCharsets.US_ASCII));
                var response = new StringBuilder();
                for (int i = 0; i < 4096; i++) {
                    int value = socket.getInputStream().read();
                    if (value <= 0) break;
                    response.append((char) value);
                }
                require("Actual ClamAV daemon responds", response.toString().startsWith("ClamAV "), checks);
            }
            require("Clean bytes pass real INSTREAM scan", scanner.scan(clean).equals("CLEAN"), checks);
            // Assemble the harmless industry-standard antivirus test string only in memory.
            // Never create an EICAR file or send it beyond this dedicated loopback daemon.
            byte[] antivirusTest = String.join("", List.of("X5O!P%@AP[4", "\\PZX54(P^)7CC)7}",
                    "$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!", "$H+H*")).getBytes(StandardCharsets.US_ASCII);
            require("EICAR is detected by the real engine", scanner.scan(antivirusTest).equals("INFECTED"), checks);
            require("A later clean scan still succeeds", scanner.scan(clean).equals("CLEAN"), checks);
            require("Empty input is rejected", scanner.scan(new byte[0]).equals("ERROR"), checks);
            require("Disabled scanning fails closed", new UploadScanner(false, "127.0.0.1", 13310).scan(clean).equals("ERROR"), checks);
            require("Non-private endpoints are refused", new UploadScanner(true, "203.0.113.1", 13310).scan(clean).equals("ERROR"), checks);
        }
        boolean simulated = args.length == 2 && args[1].equals("--stalled");
        System.out.println((simulated ? "SCANNER_DEADLINE_PASS: " : "LIVE_UPLOAD_SCANNER_PASS: ")
                + checks.size() + " checks; " + (simulated ? "simulated loopback peer; " : "dedicated loopback clamd; ")
                + String.join("; ", checks));
    }

    /** Simulated stalling peer, explicitly separate from real ClamAV detection. */
    private static void stalled(UploadScanner scanner, byte[] clean, List<String> checks) throws Exception {
        var consumed = new java.util.concurrent.atomic.AtomicBoolean();
        try (var listener = new ServerSocket(13310, 1, InetAddress.getByName("127.0.0.1"))) {
            var peer = new Thread(() -> {
                try (var socket = listener.accept()) {
                    socket.setSoTimeout(3000);
                    var in = new DataInputStream(socket.getInputStream());
                    while (in.readUnsignedByte() != 0) { /* INSTREAM command */ }
                    for (int size; (size = in.readInt()) != 0;) {
                        if (size < 0 || size > 8192 || in.readNBytes(size).length != size) return;
                    }
                    consumed.set(true);
                    // Keep each read alive without ever completing a scanner reply.
                    for (int i = 0; i < 30; i++) {
                        socket.getOutputStream().write('x');
                        socket.getOutputStream().flush();
                        Thread.sleep(1000);
                    }
                } catch (java.io.IOException expectedClose) {
                    // The application's deadline must close its connection.
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                }
            }, "synthetic-stalling-scanner");
            peer.setDaemon(true);
            peer.start();
            long start = System.nanoTime();
            String result = scanner.scan(clean);
            long elapsed = java.util.concurrent.TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start);
            peer.interrupt();
            peer.join(3000);
            require("Simulated drip response reaches the application scanner", consumed.get(), checks);
            require("Whole-operation deadline fails closed despite ongoing reads (" + elapsed + " ms)",
                    result.equals("ERROR") && elapsed >= 18000 && elapsed <= 25000, checks);
            require("Owned stalling peer is retired", !peer.isAlive(), checks);
        }
    }

    private static void require(String name, boolean passed, List<String> checks) {
        if (!passed) throw new AssertionError(name);
        checks.add(name);
    }
}
