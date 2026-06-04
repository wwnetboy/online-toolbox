import {
  ref,
  reactive,
  computed,
  watch,
  watchEffect,
  nextTick,
  onMounted,
  onUnmounted,
  onBeforeUnmount,
  defineComponent
} from 'vue'
import { config } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

Object.assign(globalThis, {
  ref,
  reactive,
  computed,
  watch,
  watchEffect,
  nextTick,
  onMounted,
  onUnmounted,
  onBeforeUnmount
})

setActivePinia(createPinia())

const DialogStub = defineComponent({
  props: ['modelValue'],
  template: '<div v-if="modelValue" role="dialog"><slot /></div>'
})

config.global.stubs = {
  Teleport: true,
  Transition: true,
  ElDialog: DialogStub,
  ElIcon: true,
  'el-dialog': DialogStub,
  'el-icon': true,
  QrcodeVue: true
}

if (!(globalThis as any).File) {
  class SimpleFile extends Blob {
    name: string
    type: string
    constructor(parts: any[], name: string, options?: any) {
      super(parts, options)
      this.name = name
      this.type = options?.type || ''
    }
  }
  ;(globalThis as any).File = SimpleFile as any
}

if (!(globalThis as any).File.prototype.arrayBuffer) {
  ;(globalThis as any).File.prototype.arrayBuffer = async function () {
    return await new Response(this).arrayBuffer()
  }
}
