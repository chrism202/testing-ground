export const metadata = {
  title: 'CCTV Person Matcher',
  description:
    'Upload a bulk repository of CCTV images and find the ones likely showing a person similar to a supplied image.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
