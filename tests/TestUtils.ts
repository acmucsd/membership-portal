export class TestUtils {
  public static toMatchArrayContents(received: any[], expected: any[], sortKey = 'uuid') {
    received.sort((a, b) => (a[sortKey] > b[sortKey] ? 1 : -1));
    expected.sort((a, b) => (a[sortKey] > b[sortKey] ? 1 : -1));

    for (let i = 0; i < received.length; i += 1) {
      expect(received[i]).toMatchObject(expected[i]);
    }

    return {
      pass: true,
      message: () => 'Expected objects in received array to match partial objects in expected array',
    };
  }
}
