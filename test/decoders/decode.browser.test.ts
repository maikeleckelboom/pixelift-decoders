import { listBrowserSupportedExtensions } from '@test/fixtures/assets';

describe('Browser Decoder', () => {
  const extensions = listBrowserSupportedExtensions();

  it('should pass', () => {
    expect(extensions.length).toBeGreaterThan(0);
  });
});
