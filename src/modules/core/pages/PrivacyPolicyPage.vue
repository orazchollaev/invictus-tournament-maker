<script setup>
const lastUpdated = "June 19, 2026"
const contactEmail = "orazchollaev@gmail.com" // <-- buraya gerçek iletişim e-postanı yaz
</script>

<template>
  <div class="privacy-policy">
    <div class="container">
      <h1>Privacy Policy</h1>
      <p class="updated">Last updated: {{ lastUpdated }}</p>

      <p>
        Invictus Tournament Maker ("the App") is designed with your privacy in mind. This Privacy
        Policy explains how we handle information when you use our application.
      </p>

      <h2>1. No Data Collection</h2>
      <p>
        Invictus Tournament Maker does
        <strong>not collect, store, or transmit</strong>
        any personal data to us or to any third party. The App operates entirely
        <strong>locally on your device</strong>
        . Any tournaments, brackets, matches, or other information you create within the App is
        stored only on your own device and is never sent to an external server.
      </p>

      <h2>2. No Account Required</h2>
      <p>
        The App does not require you to create an account, sign in, or provide any personal
        information such as your name, email address, or phone number.
      </p>

      <h2>3. No Advertising or Analytics</h2>
      <p>
        The App does not include any third-party advertising SDKs, analytics tools, or tracking
        technologies. We do not monitor how you use the App.
      </p>

      <h2>4. Permissions</h2>
      <p>
        The App may request standard device permissions required for it to function properly (for
        example, storage access to save your tournament data locally). These permissions are used
        solely to operate the App's features and are never used to collect or share data with us or
        any third party.
      </p>

      <h2>5. Children's Privacy</h2>
      <p>
        Since the App does not collect any personal information from any user, it does not knowingly
        collect personal information from children under 13 (or the relevant age in your
        jurisdiction).
      </p>

      <h2>6. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Any changes will be reflected on this
        page with an updated "Last updated" date. We encourage you to review this page periodically.
      </p>

      <h2>7. Contact Us</h2>
      <p>
        If you have any questions about this Privacy Policy, you can contact us at:
        <a :href="`mailto:${contactEmail}`">{{ contactEmail }}</a>
      </p>
    </div>
  </div>
</template>

<style scoped>
.privacy-policy {
  min-height: 100vh;
  background-color: #16181f;
  color: #e4e6eb;
  padding: 48px 16px;
}

.container {
  max-width: 720px;
  margin: 0 auto;
  line-height: 1.7;
}

h1 {
  font-size: 28px;
  margin-bottom: 4px;
  color: #ffffff;
}

.updated {
  color: #9a9ea7;
  font-size: 14px;
  margin-bottom: 32px;
}

h2 {
  font-size: 18px;
  margin-top: 32px;
  margin-bottom: 8px;
  color: #ffffff;
}

p {
  margin-bottom: 12px;
  color: #c5c8ce;
}

a {
  color: #5b9cff;
  text-decoration: underline;
}
</style>
