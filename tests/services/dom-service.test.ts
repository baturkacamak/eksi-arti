import { DOMService } from '../../src/services/dom-service';

describe('DOMService', () => {
    let domService: DOMService;

    beforeEach(() => {
        domService = new DOMService();
        document.body.innerHTML = `
      <div id="testDiv" class="test-class">
        <p class="test-p">Test paragraph</p>
        <span class="test-span">Test span</span>
      </div>
    `;
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    test('querySelector should return matching element', () => {
        const div = domService.querySelector<HTMLDivElement>('#testDiv');
        expect(div).not.toBeNull();
        expect(div?.id).toBe('testDiv');
    });

    test('querySelectorAll should return matching elements', () => {
        const elements = domService.querySelectorAll('.test-class, .test-p, .test-span');
        expect(elements.length).toBe(3);
    });

    test('createElement should create a new element', () => {
        const button = domService.createElement('button');
        expect(button.tagName).toBe('BUTTON');
    });

    test('addClass should add class to element', () => {
        const div = document.getElementById('testDiv')!;
        domService.addClass(div, 'new-class');
        expect(div.classList.contains('new-class')).toBe(true);
    });

    test('removeClass should remove class from element', () => {
        const div = document.getElementById('testDiv')!;
        domService.removeClass(div, 'test-class');
        expect(div.classList.contains('test-class')).toBe(false);
    });

    test('hasClass should check if element has class', () => {
        const div = document.getElementById('testDiv')!;
        expect(domService.hasClass(div, 'test-class')).toBe(true);
        expect(domService.hasClass(div, 'non-existent')).toBe(false);
    });

    test('toggleClass should toggle class on element', () => {
        const div = document.getElementById('testDiv')!;
        domService.toggleClass(div, 'test-class');
        expect(div.classList.contains('test-class')).toBe(false);

        domService.toggleClass(div, 'test-class');
        expect(div.classList.contains('test-class')).toBe(true);
    });

    test('appendChild should append child to parent', () => {
        const div = document.getElementById('testDiv')!;
        const span = document.createElement('span');
        span.id = 'newSpan';

        domService.appendChild(div, span);

        const appended = document.getElementById('newSpan');
        expect(appended).not.toBeNull();
        expect(appended?.parentElement).toBe(div);
    });

    test('removeChild should remove child from parent', () => {
        const div = document.getElementById('testDiv')!;
        const p = document.querySelector('.test-p')!;

        expect(p.parentElement).toBe(div);

        domService.removeChild(div, p);

        expect(document.querySelector('.test-p')).toBeNull();
    });

    test('addEventListener should add event listener to element', () => {
        const div = document.getElementById('testDiv')! as HTMLDivElement;
        const mockCallback = jest.fn();

        domService.addEventListener(div, 'click', mockCallback);

        div.click();

        expect(mockCallback).toHaveBeenCalledTimes(1);
    });
});