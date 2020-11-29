export class TestUtils {
  public static comparator(sortKey: string): (object1: object, object2: object) => number {
    return (object1: object, object2: object) => {
      if (object1[sortKey] < object2[sortKey]) return -1;
      if (object1[sortKey] > object2[sortKey]) return 1;
      return 0;
    };
  }

  public static toMatchArrayContents(received: any[], expected: any[], sortKey = 'uuid') {
    received.sort(TestUtils.comparator(sortKey));
    expected.sort(TestUtils.comparator(sortKey));

    for (let i = 0; i < received.length; i += 1) {
      expect(received[i]).toMatchObject(expected[i]);
    }

    return {
      pass: true,
      message: () => 'Expected objects in received array to match partial objects in expected array',
    };
  }
}
