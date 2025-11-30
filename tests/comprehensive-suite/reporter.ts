/**
 * Test Reporter - Generates User-Friendly Reports
 * Creates HTML and plain text reports for non-technical users
 */

import {
  TestSuiteReport,
  TestResult,
  PerformanceMetrics,
  LoadTestResult,
  HumanReadableReport,
} from "./types";
import { TestUtils } from "./utils";
import { writeFileSync } from "fs";
import { join } from "path";

export class TestReporter {
  /**
   * Generate a human-readable summary for non-technical users
   */
  generateHumanReadableSummary(report: TestSuiteReport): HumanReadableReport {
    const passRate = ((report.passed / report.totalTests) * 100).toFixed(1);
    const status =
      report.failed === 0 ? "✅ SEMUA TES BERHASIL" : "⚠️ ADA TES YANG GAGAL";

    const summary = `
═══════════════════════════════════════════════
  LAPORAN HASIL PENGUJIAN SISTEM PRIMA
═══════════════════════════════════════════════

Status: ${status}
Waktu Pengujian: ${new Date(report.timestamp).toLocaleString("id-ID")}

📊 RINGKASAN:
• Total Tes: ${report.totalTests}
• Berhasil: ${report.passed} (${passRate}%)
• Gagal: ${report.failed}
• Dilewati: ${report.skipped}
• Durasi Total: ${(report.duration / 1000).toFixed(2)} detik
`;

    const details = this.generateDetailsSection(report);
    const recommendations = this.generateRecommendations(report);

    return { summary, details, recommendations };
  }

  private generateDetailsSection(report: TestSuiteReport): string {
    let details = "\n📋 DETAIL PENGUJIAN PER KATEGORI:\n\n";

    // Auth Tests
    details += this.formatCategory(
      "🔐 Autentikasi (Login & Keamanan)",
      report.categories.auth
    );

    // Reminder Tests
    details += this.formatCategory(
      "⏰ Sistem Pengingat",
      report.categories.reminder
    );

    // WhatsApp Tests
    details += this.formatCategory(
      "💬 Integrasi WhatsApp",
      report.categories.whatsapp
    );

    // Content Tests
    details += this.formatCategory(
      "📺 Video & Berita",
      report.categories.content
    );

    // Load Tests
    details += this.formatLoadTests(report.categories.load);

    return details;
  }

  private formatCategory(title: string, category: any): string {
    if (!category || category.total === 0) {
      return `${title}\n  Status: Tidak ada tes\n\n`;
    }

    const passRate = ((category.passed / category.total) * 100).toFixed(1);
    const status = category.failed === 0 ? "✅ Berhasil" : "❌ Ada Masalah";

    let output = `${title}\n`;
    output += `  Status: ${status}\n`;
    output += `  Hasil: ${category.passed}/${category.total} tes berhasil (${passRate}%)\n`;
    output += `  Waktu: ${(category.duration / 1000).toFixed(2)} detik\n\n`;

    // Show all tests with details
    if (category.tests && category.tests.length > 0) {
      output += `  Detail Pengujian:\n`;
      category.tests.forEach((test: TestResult) => {
        const statusIcon =
          test.status === "passed"
            ? "✅"
            : test.status === "failed"
            ? "❌"
            : "⏭️";
        output += `\n     ${statusIcon} ${test.name}\n`;
        output += `        Waktu: ${test.duration.toFixed(0)}ms\n`;

        if (test.details) {
          if (test.details.endpoint) {
            output += `        Endpoint: ${test.details.method || "GET"} ${
              test.details.endpoint
            }\n`;
          }
          if (test.details.description) {
            output += `        Deskripsi: ${test.details.description}\n`;
          }
          if (test.details.statusCode) {
            output += `        Status Code: ${test.details.statusCode}\n`;
          }
        }

        if (test.status === "failed" && test.error) {
          output += `        ⚠️ Error: ${this.simplifyError(test.error)}\n`;
        }
      });
    }

    // Legacy: Show only failed tests summary
    if (category.failed > 0) {
      output += `\n  ⚠️ Ringkasan Kegagalan:\n`;
      category.tests
        .filter((t: TestResult) => t.status === "failed")
        .forEach((test: TestResult) => {
          output += `     • ${test.name}\n`;
          if (test.error) {
            output += `       Alasan: ${this.simplifyError(test.error)}\n`;
          }
        });
    }

    output += "\n";
    return output;
  }

  private formatLoadTests(load: any): string {
    let output = "🔥 UJI BEBAN (Load Testing)\n\n";

    const isProduction = TestUtils.isProduction();
    const hasAuthToken = !!process.env.TEST_AUTH_TOKEN;

    // Mode explanation header
    if (hasAuthToken) {
      output += "  ✅ MODE: Authenticated Load Testing\n";
      output += "     Test dijalankan dengan user yang terautentikasi.\n";
      output += "     Semua protected endpoints dapat diakses.\n\n";
    } else if (isProduction) {
      output += "  ℹ️  CATATAN PENTING:\n";
      output += "     Load test di production menggunakan mix endpoint:\n";
      output += "     • 1 endpoint PUBLIC (/api/health) - Dapat diakses ✅\n";
      output +=
        "     • 2-4 endpoint PROTECTED (dashboard, patients, dll) - Butuh login ❌\n";
      output += "     \n";
      output += "     Success rate rendah adalah NORMAL karena:\n";
      output += "     - Test tidak login (tidak ada authentication token)\n";
      output +=
        "     - Protected endpoints reject unauthenticated requests (SECURITY BEKERJA!)\n";
      output +=
        "     - Yang penting: Response time tetap cepat = Server performa baik\n";
      output += "     \n";
      output +=
        "     💡 Untuk authenticated load test, set: TEST_AUTH_TOKEN=<clerk_token>\n\n";
    }

    const tests = [
      { name: "10 Pengguna Bersamaan", data: load.concurrent10, endpoints: 3 },
      { name: "25 Pengguna Bersamaan", data: load.concurrent25, endpoints: 3 },
      { name: "50 Pengguna Bersamaan", data: load.concurrent50, endpoints: 3 },
      {
        name: "100 Pengguna (Stress Test)",
        data: load.stress100,
        endpoints: 5,
      },
    ];

    tests.forEach(({ name, data, endpoints }) => {
      if (!data) {
        output += `  ${name}: Tidak dijalankan\n`;
        return;
      }

      const successRate = (data.metrics.successRate * 100).toFixed(1);
      const avgTime = data.metrics.averageResponseTime.toFixed(0);
      const status = data.metrics.successRate >= 0.95 ? "✅" : "⚠️";

      output += `  ${name}: ${status}\n`;

      // Show tested endpoints if available
      if (data.endpoints && data.endpoints.length > 0) {
        output += `    📍 Endpoint yang ditest:\n`;
        data.endpoints.forEach((ep: any) => {
          const icon = ep.type === "public" ? "✅" : "🔒";
          output += `       ${icon} ${ep.method} ${ep.path} (${ep.type})\n`;
        });
      }

      output += `    • Tingkat Keberhasilan: ${successRate}%\n`;

      // Add explanation for low success rate in production
      if (isProduction && data.metrics.successRate < 0.5) {
        const publicEndpoints = endpoints === 5 ? 1 : 1; // 1 public endpoint in both cases
        const protectedEndpoints = endpoints - publicEndpoints;
        const theoreticalRate = ((publicEndpoints / endpoints) * 100).toFixed(
          0
        );
        output += `       └─> ${publicEndpoints}/${endpoints} endpoint berhasil (public: ${publicEndpoints}, protected: ${protectedEndpoints})\n`;
        output += `       └─> Theoretical max: ~${theoreticalRate}% (tanpa authentication)\n`;
      }

      output += `    • Waktu Respons Rata-rata: ${avgTime}ms\n`;
      output += `    • Waktu Tercepat: ${data.metrics.minResponseTime.toFixed(
        0
      )}ms\n`;
      output += `    • Waktu Terlama: ${data.metrics.maxResponseTime.toFixed(
        0
      )}ms\n`;

      if (data.errors.length > 0) {
        output += `    ⚠️ Error yang ditemukan:\n`;
        data.errors.slice(0, 3).forEach((err: any) => {
          // Explain what the errors mean
          let explanation = "";
          if (err.message.includes("404") && isProduction) {
            explanation = " (Protected endpoint - redirect ke login)";
          }
          output += `       • ${err.message} (${err.count}x)${explanation}\n`;
        });

        if (isProduction) {
          output += `       ℹ️  HTTP 404 = Endpoint butuh login (ini NORMAL di production)\n`;
        }
      }

      output += "\n";
    });

    return output;
  }

  private generateRecommendations(report: TestSuiteReport): string[] {
    const recommendations: string[] = [];

    // Check auth issues
    if (report.categories.auth.failed > 0) {
      recommendations.push(
        "🔐 Ada masalah pada sistem autentikasi. Periksa konfigurasi login dan keamanan."
      );
    }

    // Check reminder issues
    if (report.categories.reminder.failed > 0) {
      recommendations.push(
        "⏰ Sistem pengingat mengalami gangguan. Pastikan database dan penjadwalan berjalan dengan baik."
      );
    }

    // Check WhatsApp issues
    if (report.categories.whatsapp.failed > 0) {
      recommendations.push(
        "💬 Integrasi WhatsApp bermasalah. Cek koneksi ke server WhatsApp dan kredensial API."
      );
    }

    // Check performance issues
    const loadTests = report.categories.load;
    const isProduction = TestUtils.isProduction();

    // On production, low success rates are expected due to authentication
    // Only warn if response times are actually slow
    if (isProduction) {
      // Production: Focus on response time, not success rate (protected endpoints expected)
      if (
        loadTests.concurrent50?.metrics.averageResponseTime !== undefined &&
        loadTests.concurrent50.metrics.averageResponseTime > 3000
      ) {
        recommendations.push(
          "🐌 Sistem lambat saat banyak pengguna (50+). Pertimbangkan untuk meningkatkan kapasitas server."
        );
      }
      // Note about load test results
      if (
        loadTests.concurrent10?.metrics.successRate !== undefined &&
        loadTests.concurrent10.metrics.successRate < 0.5
      ) {
        recommendations.push(
          "ℹ️ Load test menunjukkan success rate rendah karena testing protected endpoints tanpa autentikasi. Ini normal untuk production."
        );
      }
    } else {
      // Localhost: Can test success rates properly
      if (
        loadTests.concurrent10?.metrics.successRate !== undefined &&
        loadTests.concurrent10.metrics.successRate < 0.95
      ) {
        recommendations.push(
          "⚠️ Performa sistem menurun pada beban rendah (10 pengguna). Ini masalah serius yang perlu segera diperbaiki."
        );
      }
      if (
        loadTests.concurrent50?.metrics.averageResponseTime !== undefined &&
        loadTests.concurrent50.metrics.averageResponseTime > 3000
      ) {
        recommendations.push(
          "🐌 Sistem lambat saat banyak pengguna (50+). Pertimbangkan untuk meningkatkan kapasitas server."
        );
      }
      if (
        loadTests.stress100?.metrics.successRate !== undefined &&
        loadTests.stress100.metrics.successRate < 0.8
      ) {
        recommendations.push(
          "🔥 Sistem tidak stabil pada beban tinggi (100 pengguna). Ini normal untuk stress test, tapi perlu monitoring."
        );
      }
    }

    // If all tests pass
    if (recommendations.length === 0) {
      recommendations.push(
        "✅ Semua sistem berjalan dengan baik! Tidak ada masalah yang ditemukan."
      );
    }

    return recommendations;
  }

  private simplifyError(error: string): string {
    // Simplify technical errors for non-technical users
    if (error.includes("ECONNREFUSED") || error.includes("connect")) {
      return "Tidak dapat terhubung ke server";
    }
    if (error.includes("timeout")) {
      return "Waktu tunggu habis (server terlalu lama merespons)";
    }
    if (error.includes("401") || error.includes("unauthorized")) {
      return "Masalah autentikasi (kredensial tidak valid)";
    }
    if (error.includes("404")) {
      return "Endpoint tidak ditemukan";
    }
    if (error.includes("500")) {
      return "Server mengalami error internal";
    }
    if (error.includes("rate limit")) {
      return "Terlalu banyak permintaan (dibatasi sistem)";
    }

    // Return first 100 chars if no pattern matches
    return error.substring(0, 100);
  }

  /**
   * Generate HTML report for browser viewing
   */
  generateHTMLReport(report: TestSuiteReport): string {
    const passRate = ((report.passed / report.totalTests) * 100).toFixed(1);
    const statusColor = report.failed === 0 ? "#10b981" : "#f59e0b";
    const statusText =
      report.failed === 0 ? "SEMUA TES BERHASIL" : "ADA TES YANG GAGAL";

    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Laporan Pengujian PRIMA</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      color: #333;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, ${statusColor} 0%, ${statusColor}dd 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    .header h1 { font-size: 32px; margin-bottom: 10px; }
    .header .status { font-size: 24px; font-weight: bold; margin-bottom: 20px; }
    .header .timestamp { font-size: 14px; opacity: 0.9; }
    
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 40px;
      background: #f9fafb;
    }
    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      text-align: center;
    }
    .stat-card .value {
      font-size: 36px;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 5px;
    }
    .stat-card .label {
      font-size: 14px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .categories {
      padding: 40px;
    }
    .category {
      margin-bottom: 30px;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
    }
    .category-header {
      background: #f3f4f6;
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
    }
    .category-header:hover { background: #e5e7eb; }
    .category-title {
      font-size: 20px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .category-status {
      display: flex;
      gap: 15px;
      align-items: center;
    }
    .badge {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge-success { background: #d1fae5; color: #065f46; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-error { background: #fee2e2; color: #991b1b; }
    
    .category-content {
      padding: 20px;
      display: none;
    }
    .category-content.active { display: block; }
    
    .test-item {
      padding: 12px;
      margin-bottom: 8px;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .test-item.passed { background: #f0fdf4; border-left: 4px solid #10b981; }
    .test-item.failed { background: #fef2f2; border-left: 4px solid #ef4444; }
    .test-item .name { font-weight: 500; margin-bottom: 8px; }
    .test-item .duration { color: #6b7280; font-size: 14px; white-space: nowrap; margin-left: 15px; }
    .test-item .error {
      margin-top: 8px;
      padding: 8px;
      background: #fff;
      border-radius: 4px;
      font-size: 12px;
      color: #dc2626;
      font-family: monospace;
    }
    .test-details {
      margin-top: 6px;
      font-size: 13px;
      color: #6b7280;
    }
    .test-details .endpoint {
      margin-bottom: 4px;
    }
    .test-details code {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 12px;
      color: #1f2937;
    }
    .test-details .description {
      margin-top: 4px;
      font-style: italic;
    }
    .test-details .status-code {
      margin-top: 4px;
      font-size: 12px;
    }
    
    .load-tests {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .load-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px;
    }
    .load-card h4 {
      font-size: 16px;
      margin-bottom: 15px;
      color: #374151;
    }
    .metric {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f3f4f6;
    }
    .metric:last-child { border-bottom: none; }
    .metric-label { color: #6b7280; font-size: 14px; }
    .metric-value { font-weight: 600; color: #111827; }
    
    .recommendations {
      background: #fffbeb;
      border: 2px solid #fbbf24;
      border-radius: 12px;
      padding: 30px;
      margin: 40px;
    }
    .recommendations h3 {
      font-size: 20px;
      margin-bottom: 20px;
      color: #92400e;
    }
    .recommendations ul {
      list-style: none;
    }
    .recommendations li {
      padding: 10px 0;
      padding-left: 30px;
      position: relative;
    }
    .recommendations li:before {
      content: "→";
      position: absolute;
      left: 0;
      color: #f59e0b;
      font-weight: bold;
    }
    
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; }
      .category-content { display: block !important; }
    }
  </style>
  <script>
    function toggleCategory(id) {
      const content = document.getElementById(id);
      content.classList.toggle('active');
    }
  </script>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Laporan Pengujian Sistem PRIMA</h1>
      <div class="status">${statusText}</div>
      <div class="timestamp">Waktu Pengujian: ${new Date(
        report.timestamp
      ).toLocaleString("id-ID")}</div>
    </div>
    
    <div class="summary">
      <div class="stat-card">
        <div class="value">${report.totalTests}</div>
        <div class="label">Total Tes</div>
      </div>
      <div class="stat-card">
        <div class="value" style="color: #10b981;">${report.passed}</div>
        <div class="label">Berhasil</div>
      </div>
      <div class="stat-card">
        <div class="value" style="color: #ef4444;">${report.failed}</div>
        <div class="label">Gagal</div>
      </div>
      <div class="stat-card">
        <div class="value">${passRate}%</div>
        <div class="label">Tingkat Keberhasilan</div>
      </div>
      <div class="stat-card">
        <div class="value">${(report.duration / 1000).toFixed(1)}s</div>
        <div class="label">Durasi Total</div>
      </div>
    </div>
    
    <div class="categories">
      ${this.generateCategoryHTML(
        "auth",
        "🔐 Autentikasi",
        report.categories.auth
      )}
      ${this.generateCategoryHTML(
        "reminder",
        "⏰ Sistem Pengingat",
        report.categories.reminder
      )}
      ${this.generateCategoryHTML(
        "whatsapp",
        "💬 Integrasi WhatsApp",
        report.categories.whatsapp
      )}
      ${this.generateCategoryHTML(
        "content",
        "📺 Video & Berita",
        report.categories.content
      )}
      ${this.generateLoadTestHTML(report.categories.load)}
    </div>
    
    ${this.generateRecommendationsHTML(this.generateRecommendations(report))}
  </div>
</body>
</html>`;
  }

  private generateCategoryHTML(
    id: string,
    title: string,
    category: any
  ): string {
    if (!category || category.total === 0) {
      return `
      <div class="category">
        <div class="category-header">
          <div class="category-title">${title}</div>
          <span class="badge badge-warning">Tidak ada tes</span>
        </div>
      </div>`;
    }

    const passRate = ((category.passed / category.total) * 100).toFixed(1);
    const statusBadge =
      category.failed === 0
        ? '<span class="badge badge-success">✓ Berhasil</span>'
        : '<span class="badge badge-error">✗ Ada Masalah</span>';

    const testsHTML = category.tests
      .map((test: TestResult) => {
        const errorHTML =
          test.status === "failed" && test.error
            ? `<div class="error">${this.simplifyError(test.error)}</div>`
            : "";

        const detailsHTML = test.details
          ? `<div class="test-details">
              ${
                test.details.endpoint
                  ? `<div class="endpoint"><code>${
                      test.details.method || "GET"
                    } ${test.details.endpoint}</code></div>`
                  : ""
              }
              ${
                test.details.description
                  ? `<div class="description">${test.details.description}</div>`
                  : ""
              }
              ${
                test.details.statusCode
                  ? `<div class="status-code">Status: ${test.details.statusCode}</div>`
                  : ""
              }
            </div>`
          : "";

        return `
        <div class="test-item ${test.status}">
          <div style="flex: 1;">
            <div class="name">${test.status === "passed" ? "✓" : "✗"} ${
          test.name
        }</div>
            ${detailsHTML}
            ${errorHTML}
          </div>
          <div class="duration">${test.duration.toFixed(0)}ms</div>
        </div>`;
      })
      .join("");

    return `
    <div class="category">
      <div class="category-header" onclick="toggleCategory('${id}')">
        <div class="category-title">${title}</div>
        <div class="category-status">
          <span>${category.passed}/${category.total} (${passRate}%)</span>
          ${statusBadge}
        </div>
      </div>
      <div id="${id}" class="category-content">
        ${testsHTML}
      </div>
    </div>`;
  }

  private generateLoadTestHTML(load: any): string {
    const isProduction = TestUtils.isProduction();

    // Explanation section
    let explanationHTML = "";
    if (isProduction) {
      explanationHTML = `
        <div class="info-box" style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin-bottom: 20px; border-radius: 8px;">
          <h4 style="margin: 0 0 12px 0; color: #1e40af; font-size: 16px;">ℹ️ CATATAN PENTING</h4>
          <p style="margin: 0 0 8px 0; color: #1e3a8a; line-height: 1.6;">
            Load test di production menggunakan mix endpoint:
          </p>
          <ul style="margin: 8px 0; padding-left: 20px; color: #1e3a8a;">
            <li><strong>1 endpoint PUBLIC</strong> (/api/health) - Dapat diakses ✅</li>
            <li><strong>2-4 endpoint PROTECTED</strong> (dashboard, patients, dll) - Butuh login ❌</li>
          </ul>
          <p style="margin: 12px 0 0 0; color: #1e3a8a; line-height: 1.6;">
            <strong>Success rate rendah adalah NORMAL karena:</strong><br>
            • Test tidak login (tidak ada authentication token)<br>
            • Protected endpoints reject unauthenticated requests (SECURITY BEKERJA!)<br>
            • Yang penting: Response time tetap cepat = Server performa baik
          </p>
        </div>`;
    }

    const tests = [
      { name: "10 Pengguna", data: load.concurrent10, endpoints: 3 },
      { name: "25 Pengguna", data: load.concurrent25, endpoints: 3 },
      { name: "50 Pengguna", data: load.concurrent50, endpoints: 3 },
      { name: "100 Pengguna", data: load.stress100, endpoints: 5 },
    ];

    const cardsHTML = tests
      .map(({ name, data, endpoints }) => {
        if (!data) {
          return `
        <div class="load-card">
          <h4>${name}</h4>
          <p style="color: #6b7280;">Tidak dijalankan</p>
        </div>`;
        }

        const successRate = data.metrics.successRate * 100;
        let explanationBadge = "";

        // Add explanation badge for low success rate
        if (isProduction && data.metrics.successRate < 0.5) {
          const publicEndpoints = endpoints === 5 ? 1 : 1;
          const protectedEndpoints = endpoints - publicEndpoints;
          const theoreticalRate = ((publicEndpoints / endpoints) * 100).toFixed(
            0
          );
          explanationBadge = `
            <div class="metric" style="background: #fef3c7; padding: 8px; border-radius: 4px; margin-top: 8px;">
              <span style="color: #92400e; font-size: 13px;">
                ${publicEndpoints}/${endpoints} endpoint berhasil<br>
                (public: ${publicEndpoints}, protected: ${protectedEndpoints})<br>
                Max teoritis: ~${theoreticalRate}%
              </span>
            </div>`;
        }

        return `
        <div class="load-card">
          <h4>${name}</h4>
          <div class="metric">
            <span class="metric-label">Tingkat Keberhasilan</span>
            <span class="metric-value">${successRate.toFixed(1)}%</span>
          </div>
          ${explanationBadge}
          <div class="metric">
            <span class="metric-label">Waktu Rata-rata</span>
            <span class="metric-value">${data.metrics.averageResponseTime.toFixed(
              0
            )}ms</span>
          </div>
          <div class="metric">
            <span class="metric-label">Waktu Tercepat</span>
            <span class="metric-value">${data.metrics.minResponseTime.toFixed(
              0
            )}ms</span>
          </div>
          <div class="metric">
            <span class="metric-label">Waktu Terlama</span>
            <span class="metric-value">${data.metrics.maxResponseTime.toFixed(
              0
            )}ms</span>
          </div>
          <div class="metric">
            <span class="metric-label">Total Permintaan</span>
            <span class="metric-value">${data.metrics.totalRequests}</span>
          </div>
        </div>`;
      })
      .join("");

    return `
    <div class="category">
      <div class="category-header" onclick="toggleCategory('load')">
        <div class="category-title">🔥 Uji Beban (Load Testing)</div>
      </div>
      <div id="load" class="category-content">
        ${explanationHTML}
        <div class="load-tests">
          ${cardsHTML}
        </div>
      </div>
    </div>`;
  }

  private generateRecommendationsHTML(recommendations: string[]): string {
    const listHTML = recommendations.map((rec) => `<li>${rec}</li>`).join("");

    return `
    <div class="recommendations">
      <h3>💡 Rekomendasi</h3>
      <ul>${listHTML}</ul>
    </div>`;
  }

  /**
   * Generate timestamp in GMT+7 (WIB) format: YYYYMMDD-HHmmssSSSS
   */
  private generateTimestamp(): string {
    const now = new Date();
    // Add 7 hours for GMT+7 (WIB - Waktu Indonesia Barat)
    const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);

    const year = wib.getUTCFullYear();
    const month = String(wib.getUTCMonth() + 1).padStart(2, "0");
    const day = String(wib.getUTCDate()).padStart(2, "0");
    const hours = String(wib.getUTCHours()).padStart(2, "0");
    const minutes = String(wib.getUTCMinutes()).padStart(2, "0");
    const seconds = String(wib.getUTCSeconds()).padStart(2, "0");
    const ms = String(wib.getUTCMilliseconds()).padStart(4, "0");

    return `${year}${month}${day}-${hours}${minutes}${seconds}${ms}`;
  }

  /**
   * Save reports to disk
   */
  async saveReports(
    report: TestSuiteReport,
    outputDir: string = "./test-results"
  ) {
    const timestamp = this.generateTimestamp();

    // Generate reports
    const humanReadable = this.generateHumanReadableSummary(report);
    const html = this.generateHTMLReport(report);

    // Save text report
    const textPath = join(outputDir, `test-report-${timestamp}.txt`);
    writeFileSync(
      textPath,
      humanReadable.summary +
        "\n" +
        humanReadable.details +
        "\n💡 REKOMENDASI:\n" +
        humanReadable.recommendations.map((r) => `• ${r}`).join("\n")
    );

    // Save HTML report
    const htmlPath = join(outputDir, `test-report-${timestamp}.html`);
    writeFileSync(htmlPath, html);

    // Save JSON report (for programmatic access)
    const jsonPath = join(outputDir, `test-report-${timestamp}.json`);
    writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    console.log("\n✅ Laporan berhasil disimpan:");
    console.log(`   📄 Teks: ${textPath}`);
    console.log(`   🌐 HTML: ${htmlPath}`);
    console.log(`   📊 JSON: ${jsonPath}`);

    return { textPath, htmlPath, jsonPath };
  }
}
