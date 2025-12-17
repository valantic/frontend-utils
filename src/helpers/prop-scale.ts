type PropConfig = {
  type: (NumberConstructor | StringConstructor)[];
  default: number;
  validator?(value: string): boolean;
};

/**
 * Creates a scale validation function for scale value props.
 *
 * @param {Number} defaultValue - The default scale value.
 * @param {Number[]} validNumbers - An array of valid scale values.
 * @param {String} envMode - The current environment mode (e.g., 'production', 'development').
 *
 * @returns {PropConfig} - Configuration object for the prop.
 *
 * @example @see /tests/helpers/prop-scale.ts
 */
export default function propScale(
  defaultValue: number,
  validNumbers: number[],
  envMode: string = 'production',
): PropConfig {
  const propConfig: PropConfig = {
    type: [Number, String],
    default: defaultValue,
  };

  if (envMode !== 'production') {
    if (!Array.isArray(validNumbers)) {
      throw new TypeError("'validNumbers' is not an array.");
    }

    if (typeof defaultValue !== 'number') {
      throw new TypeError("'defaultValue' is not a Number.");
    }

    propConfig.validator = function (value): boolean {
      // Note, that validators are not triggered in production mode.
      return validNumbers.includes(Number.parseInt(value, 10));
    };
  }

  return propConfig;
}
