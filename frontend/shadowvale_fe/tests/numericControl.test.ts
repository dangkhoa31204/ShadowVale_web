import { test } from 'node:test';
import assert from 'node:assert/strict';
import { numericPrecision, parseNumericInput, sliderBounds, sliderValue } from '../src/features/shared/numericRules.ts';

test('clearing a nullable value produces null, while clearing a required number remains invalid', () => {
  assert.deepEqual(parseNumericInput('', { nullable: true, min: 1 }), { valid: true, value: null });
  assert.equal(parseNumericInput('', { min: 1 }).valid, false);
  assert.deepEqual(parseNumericInput('0', { nullable: true, min: 0 }), { valid: true, value: 0 });
});

test('manual entry validates database bounds and precision without rounding or clamping', () => {
  assert.equal(parseNumericInput('0', { min: 0.01, step: 0.01 }).valid, false);
  assert.equal(parseNumericInput('1.001', { min: 0.01, max: 99999.99, step: 0.01 }).valid, false);
  assert.deepEqual(parseNumericInput('1250.25', { min: 0.01, max: 99999.99, step: 0.01, sliderMax: 100 }), { valid: true, value: 1250.25 });
  assert.equal(parseNumericInput('100000', { max: 99999.99, step: 0.01 }).valid, false);
  assert.equal(parseNumericInput('NaN', {}).valid, false);
  assert.equal(parseNumericInput('Infinity', {}).valid, false);
});

test('integer, probability, negative coordinates and precision match DB numeric types', () => {
  assert.equal(parseNumericInput('2.5', { min: 1, step: 1 }).valid, false);
  assert.deepEqual(parseNumericInput('0.123', { min: 0, max: 1, step: 0.001 }), { valid: true, value: 0.123 });
  assert.equal(parseNumericInput('1.001', { min: 0, max: 1, step: 0.001 }).valid, false);
  assert.deepEqual(parseNumericInput('-250.123', { min: -999999.999, max: 999999.999, step: 0.001 }), { valid: true, value: -250.123 });
  assert.equal(numericPrecision(0.0001), 4);
});

test('slider expands to valid manually entered values and uses database precision', () => {
  assert.deepEqual(sliderBounds(350, { min: 1, max: 2147483647, sliderMax: 100, step: 1 }), { min: 1, max: 350, step: 1 });
  assert.deepEqual(sliderBounds(-250, { min: -999999.999, max: 999999.999, sliderMin: -100, sliderMax: 100, step: 0.001 }), { min: -250, max: 100, step: 0.001 });
  assert.equal(sliderValue('0.30000000000000004', 0.001), 0.3);
});
