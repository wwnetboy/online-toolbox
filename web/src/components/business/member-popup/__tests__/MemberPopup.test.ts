import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import MemberPopup from '../MemberPopup.vue'

// Mock the Teleport component since it doesn't work well in JSDOM/happy-dom without setup
// But usually Vue Test Utils handles it if target exists.
// We can just stub it to render in place for easier testing.
const globalOptions = {
  stubs: {
    Teleport: true,
    Transition: true, // Stub transition to avoid waiting for CSS animations
    QrcodeVue: true // Stub QRCode to avoid canvas errors
  }
}

describe('MemberPopup.vue', () => {
  it('should be invisible by default', () => {
    const wrapper = mount(MemberPopup, { global: globalOptions })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('should show up when open is called', async () => {
    const wrapper = mount(MemberPopup, { global: globalOptions })
    await wrapper.vm.open()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
  })

  it('should render plan cards', async () => {
    const wrapper = mount(MemberPopup, { global: globalOptions })
    await wrapper.vm.open()
    const plans = wrapper.findAll('.plan-card')
    expect(plans.length).toBeGreaterThan(0)
  })

  it('should change selection when a plan is clicked', async () => {
    const wrapper = mount(MemberPopup, { global: globalOptions })
    await wrapper.vm.open()

    const plans = wrapper.findAll('.plan-card')
    // Assume first plan is active by default (based on logic)
    // Click the second plan
    await plans[1].trigger('click')

    // Check if class changed (we use border-[#FFD086] for active)
    expect(plans[1].classes()).toContain('active-card')
  })

  it('should close when close button is clicked', async () => {
    const wrapper = mount(MemberPopup, { global: globalOptions })
    await wrapper.vm.open()

    const closeBtn = wrapper.find('button[aria-label="Close"]')
    await closeBtn.trigger('click')

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })
})
